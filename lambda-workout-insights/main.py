"""
TheGradual Workout Insights Lambda
Provides AI-powered workout analysis using AWS Bedrock (Claude 3.5 Sonnet)
"""

import json
import os
import boto3
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
import jwt
from jwt import PyJWKClient
from decimal import Decimal

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients
dynamodb = boto3.client('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-2'))
bedrock = boto3.client('bedrock-runtime', region_name=os.environ.get('AWS_REGION', 'us-east-2'))

# Configuration from environment variables
USER_STATE_TABLE = os.environ.get('USER_STATE_TABLE_NAME', 'thegradual-user-state')
COGNITO_REGION = os.environ.get('COGNITO_REGION', 'us-east-2')
COGNITO_USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID')
BEDROCK_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-sonnet-4-6')

# Load research document at module level (cold start optimization)
RESEARCH_DOC = None
def load_research_document():
    """Load hypertrophy research document from file"""
    global RESEARCH_DOC
    if RESEARCH_DOC is None:
        try:
            with open('hypertrophy_research.md', 'r') as f:
                RESEARCH_DOC = f.read()
            logger.info(f"Loaded research document: {len(RESEARCH_DOC)} characters")
        except Exception as e:
            logger.error(f"Failed to load research document: {e}")
            RESEARCH_DOC = "# Research document not available"
    return RESEARCH_DOC


class DecimalEncoder(json.JSONEncoder):
    """JSON encoder that handles Decimal types from DynamoDB"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


def validate_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Validate JWT token with Cognito
    Returns decoded claims if valid, None otherwise
    """
    if not COGNITO_USER_POOL_ID:
        logger.error("COGNITO_USER_POOL_ID not configured")
        return None

    try:
        # Get JWKS from Cognito
        jwks_url = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"
        jwks_client = PyJWKClient(jwks_url)

        # Get signing key
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Decode and validate token
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_exp": True, "verify_aud": False}  # Cognito ID tokens don't have aud claim
        )

        logger.info(f"Token validated for user: {claims.get('sub')}")
        return claims

    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        return None
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        return None


def fetch_user_workout_history(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch user workout history from DynamoDB
    """
    try:
        response = dynamodb.get_item(
            TableName=USER_STATE_TABLE,
            Key={'uuid': {'S': user_id}}
        )

        if 'Item' not in response:
            logger.info(f"No workout history found for user: {user_id}")
            return None

        # Convert DynamoDB format to Python dict
        item = response['Item']

        # Parse sessions (stored as JSON string in DynamoDB)
        sessions = []
        if 'sessions' in item and 'S' in item['sessions']:
            try:
                sessions = json.loads(item['sessions']['S'])
            except json.JSONDecodeError:
                logger.warning("Failed to parse sessions JSON")

        user_data = {
            'uuid': user_id,
            'sessions': sessions,
            'total_sessions': len(sessions)
        }

        logger.info(f"Fetched {len(sessions)} sessions for user {user_id}")
        return user_data

    except Exception as e:
        logger.error(f"Error fetching user data: {e}")
        return None


def calculate_volume_by_muscle_group(sessions: List[Dict]) -> Dict[str, Dict]:
    """
    Calculate weekly volume per muscle group from recent sessions
    Returns dict with muscle group stats
    """
    # Focus on last 4 weeks of data
    cutoff_date = datetime.now()
    recent_sessions = []

    for session in sessions:
        if session.get('status') == 'completed' and session.get('completedAt'):
            try:
                session_date = datetime.fromisoformat(session['completedAt'].replace('Z', '+00:00'))
                days_ago = (cutoff_date - session_date).days
                if days_ago <= 28:  # Last 4 weeks
                    recent_sessions.append({**session, 'days_ago': days_ago})
            except:
                pass

    # Calculate volume per muscle group
    muscle_stats = {}

    for session in recent_sessions:
        for exercise in session.get('exercises', []):
            category = exercise.get('category', 'Unknown')

            if category not in muscle_stats:
                muscle_stats[category] = {
                    'total_sets': 0,
                    'total_volume': 0,
                    'exercises': set(),
                    'sessions': 0
                }

            # Count completed sets
            completed_sets = [s for s in exercise.get('sets', []) if s.get('completed')]
            muscle_stats[category]['total_sets'] += len(completed_sets)
            muscle_stats[category]['exercises'].add(exercise.get('name'))

            # Calculate volume (sets × reps × weight)
            for set_data in completed_sets:
                reps = set_data.get('reps', 0)
                weight = set_data.get('weight', 0)
                muscle_stats[category]['total_volume'] += reps * weight

    # Calculate weekly averages (4 week period)
    for category in muscle_stats:
        muscle_stats[category]['exercises'] = list(muscle_stats[category]['exercises'])
        muscle_stats[category]['sets_per_week'] = muscle_stats[category]['total_sets'] / 4
        muscle_stats[category]['volume_per_week'] = muscle_stats[category]['total_volume'] / 4

    return muscle_stats


def analyze_progressive_overload(sessions: List[Dict]) -> List[Dict]:
    """
    Analyze progressive overload trends for each exercise
    Returns list of insights about progression/plateaus
    ONLY analyzes sessions from the last 3 weeks (21 days)
    """
    # Filter sessions to last 3 weeks only
    cutoff_date = datetime.now()
    recent_sessions = []

    for session in sessions:
        if session.get('status') != 'completed' or not session.get('completedAt'):
            continue

        try:
            session_date = datetime.fromisoformat(session['completedAt'].replace('Z', '+00:00'))
            days_ago = (cutoff_date - session_date).days

            if days_ago <= 21:  # Only last 3 weeks
                recent_sessions.append(session)
        except Exception as e:
            logger.warning(f"Error parsing session date in progressive overload: {e}")
            continue

    # Group by exercise
    exercise_history = {}

    for session in sorted(recent_sessions, key=lambda x: x.get('completedAt', '')):
        for exercise in session.get('exercises', []):
            ex_id = exercise.get('id')
            ex_name = exercise.get('name')

            if not ex_id or not ex_name:
                continue

            if ex_id not in exercise_history:
                exercise_history[ex_id] = {
                    'name': ex_name,
                    'category': exercise.get('category'),
                    'sessions': []
                }

            # Get max weight from this session
            completed_sets = [s for s in exercise.get('sets', []) if s.get('completed')]
            if completed_sets:
                max_weight = max([s.get('weight', 0) for s in completed_sets])
                total_reps = sum([s.get('reps', 0) for s in completed_sets])
                total_volume = sum([s.get('reps', 0) * s.get('weight', 0) for s in completed_sets])

                exercise_history[ex_id]['sessions'].append({
                    'date': session.get('completedAt'),
                    'max_weight': max_weight,
                    'total_reps': total_reps,
                    'total_volume': total_volume
                })

    # Analyze trends
    insights = []
    for ex_id, data in exercise_history.items():
        if len(data['sessions']) < 3:
            continue  # Need at least 3 sessions to detect trends

        recent_sessions = data['sessions'][-4:]  # Last 4 sessions
        weights = [s['max_weight'] for s in recent_sessions]
        volumes = [s['total_volume'] for s in recent_sessions]

        # Check for progression
        if len(set(weights)) == 1:  # Same weight every session
            insights.append({
                'type': 'plateau',
                'exercise': data['name'],
                'category': data['category'],
                'message': f"No weight progression on {data['name']} for last {len(recent_sessions)} sessions"
            })
        elif weights[-1] > weights[0]:  # Weight increasing
            percent_increase = ((weights[-1] - weights[0]) / weights[0]) * 100
            insights.append({
                'type': 'progress',
                'exercise': data['name'],
                'category': data['category'],
                'message': f"Strong progression on {data['name']}: {weights[0]}kg → {weights[-1]}kg (+{percent_increase:.1f}%)"
            })
        elif weights[-1] < weights[0]:  # Weight decreasing
            insights.append({
                'type': 'warning',
                'exercise': data['name'],
                'category': data['category'],
                'message': f"Performance declining on {data['name']}: {weights[0]}kg → {weights[-1]}kg (consider deload)"
            })

    return insights


def build_recent_exercise_table(sessions: List[Dict]) -> str:
    """
    Build a markdown table of exercises performed in the last 3 weeks
    Grouped by week with exercise details
    """
    from collections import defaultdict

    cutoff_date = datetime.now()

    # Group exercises by week and exercise name
    exercise_data = defaultdict(lambda: {
        'muscle_group': '',
        'weeks': {1: [], 2: [], 3: []},  # Week 1 = most recent
        'last_performed': None
    })

    for session in sessions:
        if session.get('status') != 'completed' or not session.get('completedAt'):
            continue

        try:
            session_date = datetime.fromisoformat(session['completedAt'].replace('Z', '+00:00'))
            days_ago = (cutoff_date - session_date).days

            if days_ago > 21:  # Only last 3 weeks
                continue

            # Determine which week (1 = most recent week, 3 = oldest)
            week_num = min(3, (days_ago // 7) + 1)

            for exercise in session.get('exercises', []):
                ex_name = exercise.get('name', 'Unknown')
                ex_category = exercise.get('category', 'Unknown')

                # Get completed sets
                completed_sets = [s for s in exercise.get('sets', []) if s.get('completed')]
                if not completed_sets:
                    continue

                # Store exercise info
                exercise_data[ex_name]['muscle_group'] = ex_category

                # Update last performed date
                if (exercise_data[ex_name]['last_performed'] is None or
                    session_date > exercise_data[ex_name]['last_performed']):
                    exercise_data[ex_name]['last_performed'] = session_date

                # Format set data: "3×10@80kg"
                set_summaries = []
                for set_data in completed_sets:
                    reps = set_data.get('reps', 0)
                    weight = set_data.get('weight', 0)
                    if weight > 0:
                        set_summaries.append(f"{reps}@{weight}kg")
                    else:
                        set_summaries.append(f"{reps} reps")

                if set_summaries:
                    exercise_data[ex_name]['weeks'][week_num].append(', '.join(set_summaries[:3]))  # Limit to 3 sets shown

        except Exception as e:
            logger.warning(f"Error processing session for table: {e}")
            continue

    # Build markdown table
    if not exercise_data:
        return "No exercises found in the last 3 weeks."

    table = "| Exercise | Muscle | Week 1 (Recent) | Week 2 | Week 3 (Oldest) | Last Done |\n"
    table += "|----------|--------|-----------------|--------|-----------------|----------|\n"

    # Sort by last performed (most recent first)
    sorted_exercises = sorted(
        exercise_data.items(),
        key=lambda x: x[1]['last_performed'] or datetime.min,
        reverse=True
    )

    for ex_name, data in sorted_exercises:
        muscle = data['muscle_group']
        last_performed = data['last_performed']
        days_since = (cutoff_date - last_performed).days if last_performed else 999

        last_done_str = f"{days_since}d ago" if days_since < 21 else "21+ days"

        # Format week data
        week_cols = []
        for week in [1, 2, 3]:
            week_data = data['weeks'][week]
            if week_data:
                week_cols.append("<br>".join(week_data))  # Multiple sessions in same week on new lines
            else:
                week_cols.append("-")

        table += f"| {ex_name} | {muscle} | {week_cols[0]} | {week_cols[1]} | {week_cols[2]} | {last_done_str} |\n"

    return table


def build_analysis_prompt(user_data: Dict, research: str) -> str:
    """
    Build comprehensive prompt for Bedrock
    """
    sessions = user_data.get('sessions', [])
    total_sessions = len([s for s in sessions if s.get('status') == 'completed'])

    # Calculate muscle group volume
    muscle_stats = calculate_volume_by_muscle_group(sessions)

    # Analyze progressive overload
    overload_insights = analyze_progressive_overload(sessions)

    # Build recent exercise table
    exercise_table = build_recent_exercise_table(sessions)

    # Build prompt
    prompt = f"""# Workout Analysis Request

## User Data Summary

**Total Completed Sessions:** {total_sessions}
**Analysis Period:** Last 3 weeks (focus) + 4 weeks (volume stats)

### Volume Per Muscle Group (Last 4 Weeks)

"""

    for category, stats in muscle_stats.items():
        prompt += f"""
**{category}:**
- Total sets: {stats['total_sets']} (avg {stats['sets_per_week']:.1f} sets/week)
- Exercises: {', '.join(stats['exercises'])}
- Total volume: {stats['total_volume']:.0f}kg (avg {stats['volume_per_week']:.0f}kg/week)
"""

    prompt += f"""

### Recent Exercise Activity (Last 3 Weeks)

{exercise_table}

**IMPORTANT**: This table shows the exercises the user has actually performed in the last 3 weeks. Focus your analysis ONLY on these exercises. Do NOT include recommendations for exercises not shown in this table.

"""

    prompt += "\n### Progressive Overload Analysis\n\n"

    if overload_insights:
        for insight in overload_insights[:10]:  # Limit to top 10
            prompt += f"- [{insight['type'].upper()}] {insight['message']}\n"
    else:
        prompt += "- Insufficient data for progressive overload analysis\n"

    prompt += f"""

### Recent Sessions (Last 5)

"""

    # Include last 5 sessions with details
    recent_sessions = [s for s in sessions if s.get('status') == 'completed'][-5:]
    for i, session in enumerate(reversed(recent_sessions), 1):
        completed_date = session.get('completedAt', 'Unknown')
        template_name = (session.get('templateReference') or {}).get('templateName', 'Unknown')
        exercises = session.get('exercises', [])

        prompt += f"""
**Session {i}** ({completed_date})
- Template: {template_name}
- Exercises: {len(exercises)}
- Total sets: {sum([len([s for s in ex.get('sets', []) if s.get('completed')]) for ex in exercises])}
"""

    prompt += f"""

---

## Your Task

Based on the user's workout data above and the hypertrophy research provided below, analyze their training and provide:

1. **Progress Insights** - What's going well? Where are they seeing good progression?
2. **Warnings** - Any concerning patterns? (plateaus, overtraining signs, volume issues)
3. **Actionable Recommendations** - Specific, evidence-based advice to improve results

Focus on:
- Volume assessment (MEV/MAV/MRV)
- Progressive overload (are they progressing?)
- Muscle group balance
- Plateau detection

Return your analysis as JSON with this structure:
{{
  "insights": [
    {{"type": "progress|plateau|warning", "title": "...", "message": "...", "category": "Chest|Back|etc"}}
  ],
  "recommendations": [
    {{"priority": "high|medium|low", "title": "...", "message": "...", "category": "Volume|Progressive Overload|Balance|Recovery"}}
  ],
  "summary": "2-3 sentence overall assessment"
}}

**CRITICAL INSTRUCTIONS:**
- Focus ONLY on exercises performed in the last 3 weeks (shown in the Recent Exercise Activity table)
- Do NOT include recommendations for exercises the user hasn't done in the last 3 weeks
- Weight data from the last 3 weeks much more heavily when identifying trends and patterns
- Be specific with numbers and examples from the recent activity table

---

## Hypertrophy Research Reference

{research}
"""

    # Debug: Log full prompt being sent to AI
    logger.info("=" * 80)
    logger.info("FULL USER PROMPT BEING SENT TO BEDROCK:")
    logger.info("=" * 80)
    logger.info(prompt)
    logger.info("=" * 80)

    return prompt


def call_bedrock(prompt: str) -> Dict[str, Any]:
    """
    Call AWS Bedrock Converse API with Claude 3.5 Sonnet
    """
    system_prompt = """You are an expert strength and conditioning coach with deep knowledge of hypertrophy training science.

Analyze the user's workout data using evidence-based principles from the research provided. Be specific, actionable, and supportive. Focus on what the data shows, not assumptions.

Always return valid JSON matching the requested structure. Be concise but thorough."""

    try:
        # Debug: Log system prompt
        logger.info("=" * 80)
        logger.info("SYSTEM PROMPT:")
        logger.info("=" * 80)
        logger.info(system_prompt)
        logger.info("=" * 80)
        logger.info(f"User prompt length: {len(prompt)} characters")

        logger.info(f"Calling Bedrock with model: {BEDROCK_MODEL_ID}")

        response = bedrock.converse(
            modelId=BEDROCK_MODEL_ID,
            messages=[
                {
                    "role": "user",
                    "content": [{"text": prompt}]
                }
            ],
            system=[{"text": system_prompt}],
            inferenceConfig={
                "temperature": 0.7,
                "maxTokens": 3000
            }
        )

        # Extract response text
        output = response['output']['message']['content'][0]['text']

        # Log token usage
        usage = response.get('usage', {})
        logger.info(f"Bedrock usage - Input tokens: {usage.get('inputTokens')}, Output tokens: {usage.get('outputTokens')}")

        # Parse JSON response
        # Claude sometimes wraps JSON in markdown code blocks
        if output.strip().startswith('```'):
            # Extract JSON from code block
            lines = output.strip().split('\n')
            json_str = '\n'.join(lines[1:-1])  # Remove first and last line (```json and ```)
        else:
            json_str = output

        result = json.loads(json_str)
        return result

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Bedrock response as JSON: {e}")
        logger.error(f"Raw response: {output}")
        return {
            "insights": [],
            "recommendations": [{
                "priority": "high",
                "title": "Analysis Error",
                "message": "Failed to parse AI response. Please try again.",
                "category": "System"
            }],
            "summary": "Analysis failed due to parsing error."
        }
    except Exception as e:
        logger.error(f"Bedrock API error: {e}")
        raise


def lambda_handler(event, context):
    """
    Main Lambda handler
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")

        # Load research document
        research = load_research_document()

        # Parse request body to get user workout data
        body = {}
        if event.get('body'):
            try:
                body = json.loads(event['body'])
            except:
                pass

        # Extract Authorization header
        headers = event.get('headers', {})
        auth_header = headers.get('authorization') or headers.get('Authorization')

        if not auth_header:
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': 'Missing authorization header'})
            }

        # Extract token (Bearer <token>)
        if not auth_header.startswith('Bearer '):
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': 'Invalid authorization format. Expected: Bearer <token>'})
            }

        token = auth_header[7:]  # Remove 'Bearer ' prefix

        # Validate JWT token
        claims = validate_jwt_token(token)
        if not claims:
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': 'Invalid or expired token'})
            }

        # Extract user ID from token
        user_id = claims.get('sub')
        if not user_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': 'Invalid token: missing sub claim'})
            }

        logger.info(f"Processing insights request for authenticated user: {user_id}")

        # Check if user data is provided in request body
        if 'sessions' in body:
            # User data sent directly in request body
            user_data = {
                'uuid': user_id,
                'sessions': body.get('sessions', []),
                'customExercises': body.get('customExercises', []),
                'customTemplates': body.get('customTemplates', []),
                'activeSession': body.get('activeSession'),
                'bodyMeasurements': body.get('bodyMeasurements', [])
            }
            logger.info(f"Using user data from request body: {len(user_data['sessions'])} sessions")
        else:
            # Fallback: Fetch from DynamoDB (legacy behavior)
            logger.info("No user data in request body, fetching from DynamoDB")
            user_data = fetch_user_workout_history(user_id)

        if not user_data or not user_data.get('sessions'):
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'insights': [],
                    'recommendations': [{
                        'priority': 'high',
                        'title': 'Start Training',
                        'message': 'Complete a few workouts to get personalized insights!',
                        'category': 'Getting Started'
                    }],
                    'summary': 'No workout data available yet. Start logging sessions to receive AI-powered analysis.'
                })
            }

        # Build analysis prompt
        prompt = build_analysis_prompt(user_data, research)
        logger.info(f"Prompt length: {len(prompt)} characters")

        # Call Bedrock for analysis
        analysis = call_bedrock(prompt)

        # Return insights
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': json.dumps(analysis, cls=DecimalEncoder)
        }

    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }
