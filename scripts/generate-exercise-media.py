#!/usr/bin/env python3
"""
Generate exercise videos and anatomical images using AWS Bedrock Nova
"""

import boto3
import json
import time
import os
from pathlib import Path

# AWS Configuration
BEDROCK_REGION = 'us-east-1'  # Nova Reel/Canvas only available in Virginia!
S3_REGION = 'us-east-2'  # S3 bucket in Ohio
S3_BUCKET = 'thegradual-exercise-media'
MODEL_ID_VIDEO = 'amazon.nova-reel-v1:0'  # Nova Reel for video
MODEL_ID_IMAGE = 'amazon.nova-canvas-v1:0'  # Nova Canvas for images

# Initialize clients
bedrock = boto3.client('bedrock-runtime', region_name=BEDROCK_REGION)  # us-east-1 for models
s3 = boto3.client('s3', region_name=S3_REGION)  # us-east-2 for storage

# Exercises to generate media for
EXERCISES = [
    {
        "id": "chest-1",
        "name": "Barbell Bench Press",
        "description": "Lie on a flat bench, grip the barbell slightly wider than shoulder-width. Lower the bar to mid-chest, then press back up.",
        "primaryMuscles": ["Pectoralis Major", "Anterior Deltoids"],
        "secondaryMuscles": ["Triceps Brachii", "Serratus Anterior"],
    },
    {
        "id": "back-1",
        "name": "Deadlift",
        "description": "Hip-width stance, grip barbell. Drive through heels while keeping back straight, extending hips and knees.",
        "primaryMuscles": ["Erector Spinae", "Gluteus Maximus", "Hamstrings"],
        "secondaryMuscles": ["Latissimus Dorsi", "Trapezius", "Quadriceps"],
    },
    {
        "id": "legs-1",
        "name": "Barbell Squat",
        "description": "Bar on upper back, descend until thighs parallel to ground, drive through heels to stand.",
        "primaryMuscles": ["Quadriceps", "Gluteus Maximus"],
        "secondaryMuscles": ["Hamstrings", "Erector Spinae", "Core Muscles"],
    }
]

# Concise aesthetic guidelines (to fit within API limits)
# Video prompt limit: 512 chars
# Image prompt limit: 1024 chars


def generate_video_prompt(exercise):
    """Create concise video prompt for Nova Reel (max 512 chars, 6 second duration)"""
    # Create exercise-specific form cues
    form_cues = {
        "chest-1": "Lower bar to chest, press straight up, elbows 45 degrees",
        "back-1": "Lift barbell from floor, drive through heels, keep back straight, hips and knees extend together",
        "legs-1": "Descend until thighs parallel, drive through heels, knees track over toes"
    }

    exercise_id = exercise.get('id', 'chest-1')
    cue = form_cues.get(exercise_id, "Complete one full repetition with proper form")

    return f"""Simplified 3D animated figure demonstrating {exercise['name']} on white background. Educational fitness app style. Side view showing: bar path, joint angles, body position. {cue}. Smooth 6-second loop showing complete range of motion. Focus on form and technique, not realism."""


def generate_anatomical_image_prompt(exercise, view_angle):
    """Create concise anatomical image prompt for Nova Canvas (max 1024 chars)"""
    muscles_highlighted = exercise['primaryMuscles'] + exercise['secondaryMuscles']

    view_map = {'front': 'anterior', 'back': 'posterior', 'side': 'lateral'}

    # Create detailed muscle list for better visualization
    muscle_list = ', '.join(muscles_highlighted)

    return f"""Close-up anatomical illustration showing {view_map[view_angle]} view. Focus on these specific muscles: {muscle_list}. Show detailed muscle anatomy with these muscles highlighted in BRIGHT RED against white background. Other surrounding muscles in light grey for anatomical context. Medical textbook quality, 2D cross-sectional view showing muscle fiber detail. Clear muscle definition and separation. Professional medical illustration. No labels, no text. For {exercise['name']} exercise."""


def invoke_nova_reel(prompt, output_path):
    """Generate video using Amazon Nova Reel (async)"""
    print(f"🎬 Generating video... (this may take 2-3 minutes)")

    request_body = {
        "taskType": "TEXT_VIDEO",
        "textToVideoParams": {
            "text": prompt,
        },
        "videoGenerationConfig": {
            "durationSeconds": 6,  # Nova Reel only supports 6 seconds
            "fps": 24,
            "dimension": "1280x720",
            "seed": int(time.time())  # Unique seed per video
        }
    }

    # Start async video generation
    response = bedrock.start_async_invoke(
        modelId=MODEL_ID_VIDEO,
        modelInput=request_body,
        outputDataConfig={
            's3OutputDataConfig': {
                's3Uri': f's3://{S3_BUCKET}/temp/'
            }
        }
    )

    invocation_arn = response['invocationArn']
    invocation_id = invocation_arn.split('/')[-1]
    print(f"   Started: {invocation_id}")

    # Poll for completion
    print("   Waiting for video generation", end='', flush=True)
    for _ in range(120):  # Max 10 minutes
        time.sleep(5)
        print('.', end='', flush=True)

        status_response = bedrock.get_async_invoke(
            invocationArn=invocation_arn
        )

        status = status_response['status']

        if status == 'Completed':
            print(" ✅")
            # Download from S3
            s3_output_path = f"temp/{invocation_id}/output.mp4"
            s3.download_file(S3_BUCKET, s3_output_path, str(output_path))
            print(f"✅ Video saved to {output_path}")
            return output_path

        elif status in ['Failed', 'TimedOut']:
            print(f"\n❌ Generation failed: {status_response.get('failureMessage', 'Unknown')}")
            return None

    print("\n❌ Timeout waiting for video generation")
    return None


def invoke_nova_canvas(prompt, output_path):
    """Generate image using Amazon Nova Canvas (synchronous)"""
    print(f"🎨 Generating anatomical image...")

    request_body = {
        "taskType": "TEXT_IMAGE",
        "textToImageParams": {
            "text": prompt,
            "negativeText": "blurry, low quality, watermark, text, labels, shadows, gradients, colored background, 3D rendering"
        },
        "imageGenerationConfig": {
            "numberOfImages": 1,
            "height": 1024,
            "width": 1024,
            "cfgScale": 8.0,
            "seed": int(time.time())  # Unique seed per image for variety
        }
    }

    try:
        response = bedrock.invoke_model(
            modelId=MODEL_ID_IMAGE,
            body=json.dumps(request_body)
        )

        response_body = json.loads(response['body'].read())

        # Save image to file
        images = response_body.get('images', [])
        if images:
            import base64
            with open(output_path, 'wb') as f:
                f.write(base64.b64decode(images[0]))
            print(f"✅ Image saved to {output_path}")
            return output_path
        else:
            print(f"❌ No image data in response")
            return None

    except Exception as e:
        print(f"❌ Error generating image: {e}")
        return None


def upload_to_s3(local_path, s3_key):
    """Upload file to S3 bucket"""
    print(f"☁️  Uploading to S3: {s3_key}")
    s3.upload_file(local_path, S3_BUCKET, s3_key)
    s3_url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{s3_key}"
    print(f"✅ Uploaded: {s3_url}")
    return s3_url


def generate_exercise_media(exercise):
    """Generate video and anatomical images for one exercise"""
    print(f"\n{'='*60}")
    print(f"🏋️  Processing: {exercise['name']}")
    print(f"{'='*60}\n")

    exercise_id = exercise['id']
    output_dir = Path('media_output')
    output_dir.mkdir(exist_ok=True)

    results = {
        'exercise_id': exercise_id,
        'name': exercise['name'],
        'video_url': None,
        'anatomical_images': {}
    }

    # 1. Generate exercise video
    print("\n📹 STEP 1: Generating demonstration video...")
    video_prompt = generate_video_prompt(exercise)
    video_path = output_dir / f"{exercise_id}_demo.mp4"

    try:
        if invoke_nova_reel(video_prompt, video_path):
            video_s3_key = f"videos/{exercise_id}_demo.mp4"
            results['video_url'] = upload_to_s3(video_path, video_s3_key)
    except Exception as e:
        print(f"❌ Error generating video: {e}")

    # 2. Generate anatomical images (3 views)
    print("\n🎨 STEP 2: Generating anatomical illustrations...")
    views = ['front', 'back', 'side']

    for view in views:
        print(f"\n  → Generating {view} view...")
        image_prompt = generate_anatomical_image_prompt(exercise, view)
        image_path = output_dir / f"{exercise_id}_anatomy_{view}.png"

        try:
            if invoke_nova_canvas(image_prompt, image_path):
                image_s3_key = f"images/{exercise_id}_anatomy_{view}.png"
                results['anatomical_images'][view] = upload_to_s3(image_path, image_s3_key)

                # Rate limiting - wait between requests
                time.sleep(2)
        except Exception as e:
            print(f"❌ Error generating {view} image: {e}")

    return results


def main():
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║  🎬 THEGRADUAL EXERCISE MEDIA GENERATOR                    ║
    ║  Using AWS Bedrock Nova (Reel + Canvas)                   ║
    ╚════════════════════════════════════════════════════════════╝
    """)

    all_results = []

    for exercise in EXERCISES:
        try:
            results = generate_exercise_media(exercise)
            all_results.append(results)

            # Longer wait between exercises
            print("\n⏳ Waiting 10 seconds before next exercise...")
            time.sleep(10)

        except Exception as e:
            print(f"❌ Failed to process {exercise['name']}: {e}")
            continue

    # Save results manifest
    manifest_path = Path('media_output/manifest.json')
    with open(manifest_path, 'w') as f:
        json.dump(all_results, f, indent=2)

    print(f"\n\n{'='*60}")
    print("✅ GENERATION COMPLETE!")
    print(f"{'='*60}")
    print(f"\nResults saved to: {manifest_path}")
    print(f"\nS3 Bucket: s3://{S3_BUCKET}/")
    print("\nGenerated:")
    for result in all_results:
        print(f"\n  {result['name']}:")
        if result['video_url']:
            print(f"    Video: {result['video_url']}")
        for view, url in result['anatomical_images'].items():
            print(f"    {view.capitalize()} view: {url}")


if __name__ == '__main__':
    main()
