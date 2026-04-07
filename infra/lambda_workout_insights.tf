# Workout Insights Lambda - AI-powered workout analysis using AWS Bedrock
#
# This Lambda provides personalized training insights by analyzing user workout data
# using Claude 3.5 Sonnet via Bedrock Converse API and peer-reviewed hypertrophy research.

locals {
  workout_insights_lambda_name = local.lambda_workout_insights_name
  workout_insights_s3_key      = "lambda/workout-insights.zip"
}

# ==========================================
# IAM Role and Policies
# ==========================================

resource "aws_iam_role" "workout_insights" {
  name = "${local.workout_insights_lambda_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Purpose = "Workout Insights AI Analysis"
  })
}

# CloudWatch Logs Policy
resource "aws_iam_role_policy" "workout_insights_logs" {
  name = "${local.workout_insights_lambda_name}-logs"
  role = aws_iam_role.workout_insights.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# DynamoDB Read Policy (fetch user workout history)
resource "aws_iam_role_policy" "workout_insights_dynamodb" {
  name = "${local.workout_insights_lambda_name}-dynamodb"
  role = aws_iam_role.workout_insights.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem"
        ]
        Resource = aws_dynamodb_table.user_states.arn
      }
    ]
  })
}

# Bedrock Policy (invoke Claude model for AI analysis)
resource "aws_iam_role_policy" "workout_insights_bedrock" {
  name = "${local.workout_insights_lambda_name}-bedrock"
  role = aws_iam_role.workout_insights.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = [
          "arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4*",
          "arn:aws:bedrock:*:962595531541:inference-profile/us.anthropic.claude-sonnet-4*"
        ]
      }
    ]
  })
}

# ==========================================
# Lambda Function
# ==========================================

resource "aws_lambda_function" "workout_insights" {
  function_name = local.workout_insights_lambda_name
  role          = aws_iam_role.workout_insights.arn

  runtime       = "python3.12"
  handler       = "main.lambda_handler"
  architectures = ["x86_64"]

  # Code from S3 (uploaded via Makefile)
  s3_bucket = local.lambda_artifacts_bucket
  s3_key    = local.workout_insights_s3_key

  timeout     = 60 # Bedrock AI model calls can take 30+ seconds with large payloads
  memory_size = 512

  environment {
    variables = {
      USER_STATE_TABLE_NAME = aws_dynamodb_table.user_states.name
      COGNITO_USER_POOL_ID  = aws_cognito_user_pool.this.id
      COGNITO_REGION        = data.aws_region.current.name
      BEDROCK_MODEL_ID      = "us.anthropic.claude-sonnet-4-6"
    }
  }

  tags = merge(local.common_tags, {
    Purpose = "AI Workout Analysis"
    Runtime = "Python 3.12"
    AI      = "AWS Bedrock Claude"
  })
}

# ==========================================
# Lambda Function URL (Public endpoint with CORS)
# ==========================================

resource "aws_lambda_function_url" "workout_insights" {
  function_name      = aws_lambda_function.workout_insights.function_name
  authorization_type = "NONE" # JWT validation handled in Lambda code

  cors {
    allow_credentials = true
    allow_origins     = concat(
      ["https://${var.domain_name}", "https://www.${var.domain_name}"],
      ["http://localhost:5173", "http://localhost:5555"] # Dev environments
    )
    allow_methods = ["GET", "POST"]
    allow_headers = ["content-type", "authorization"]
    expose_headers = ["content-type"]
    max_age        = 86400 # 24 hours
  }
}

# ==========================================
# CloudWatch Log Group
# ==========================================

resource "aws_cloudwatch_log_group" "workout_insights" {
  name              = "/aws/lambda/${local.workout_insights_lambda_name}"
  retention_in_days = 7

  tags = local.common_tags
}

# ==========================================
# Outputs
# ==========================================

output "workout_insights_lambda_url" {
  description = "Lambda Function URL for workout insights API"
  value       = aws_lambda_function_url.workout_insights.function_url
}

output "workout_insights_lambda_arn" {
  description = "ARN of the workout insights Lambda function"
  value       = aws_lambda_function.workout_insights.arn
}
