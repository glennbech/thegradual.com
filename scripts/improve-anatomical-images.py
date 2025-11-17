#!/usr/bin/env python3
"""
Iterative improvement of anatomical images for fitness app
Generate → Evaluate → Refine prompt → Repeat
"""

import boto3
import json
import time
from pathlib import Path

# AWS Configuration
BEDROCK_REGION = 'us-east-1'
S3_REGION = 'us-east-2'
S3_BUCKET = 'thegradual-exercise-media'
MODEL_ID_IMAGE = 'amazon.nova-canvas-v1:0'

bedrock = boto3.client('bedrock-runtime', region_name=BEDROCK_REGION)
s3 = boto3.client('s3', region_name=S3_REGION)

# Test with one exercise (Bench Press)
TEST_EXERCISE = {
    "id": "chest-1",
    "name": "Barbell Bench Press",
    "primaryMuscles": ["Pectoralis Major", "Anterior Deltoids"],
    "secondaryMuscles": ["Triceps Brachii", "Serratus Anterior"]
}

# Prompt variations to test (5 iterations)
PROMPT_VARIATIONS = [
    # Iteration 1: Fitness app icon style
    """Fitness app muscle diagram for {exercise_name}. Simple, clean illustration showing front view of human torso. Highlight {muscles} in BRIGHT RED. Other muscles in light gray. White background. Icon-style graphic, minimal detail. For exercise tracking app UI. No text, no labels.""",

    # Iteration 2: Muscle group visualization
    """Exercise muscle group visualization for fitness app. Front view showing which muscles are worked during {exercise_name}. Highlighted muscles: {muscles} in vibrant red. Clean white background. Simplified anatomy, clear and easy to understand at small sizes. Fitness tracker UI style.""",

    # Iteration 3: Color-coded muscle map
    """Muscle activation map for {exercise_name}. Front anatomical view with {muscles} highlighted in bright red/orange gradient. Simple silhouette style on white. Designed for mobile fitness app. Clear, bold, easy to read. Focus on visual clarity over anatomical accuracy.""",

    # Iteration 4: Exercise guide illustration
    """Exercise guide muscle illustration. Show front view of human body with {muscles} prominently highlighted in red. White clean background. Style: modern fitness app graphics (like MyFitnessPal, Fitbod). Simple, bold colors. Minimalist anatomy. For {exercise_name}.""",

    # Iteration 5: Training app diagram
    """Workout training app muscle diagram. Front body view showing muscles worked: {muscles}. Bright red highlights on simplified body figure. White background. Bold, clean, app-icon quality. Instantly recognizable muscle groups. For {exercise_name} exercise card."""
]


def generate_image(prompt, iteration):
    """Generate image with Nova Canvas"""
    print(f"\n{'='*60}")
    print(f"🎨 ITERATION {iteration}/5")
    print(f"{'='*60}")
    print(f"Prompt: {prompt[:150]}...")

    request_body = {
        "taskType": "TEXT_IMAGE",
        "textToImageParams": {
            "text": prompt,
            "negativeText": "photo, photograph, realistic, 3D render, complex detail, shadows, text, labels, medical textbook"
        },
        "imageGenerationConfig": {
            "numberOfImages": 1,
            "height": 1024,
            "width": 1024,
            "cfgScale": 8.0,
            "seed": iteration  # Different seed per iteration
        }
    }

    try:
        print("   Generating image...")
        response = bedrock.invoke_model(
            modelId=MODEL_ID_IMAGE,
            body=json.dumps(request_body)
        )

        response_body = json.loads(response['body'].read())
        images = response_body.get('images', [])

        if images:
            import base64
            output_path = f"media_output/iteration_{iteration}_chest_front.png"
            with open(output_path, 'wb') as f:
                f.write(base64.b64decode(images[0]))

            # Upload to S3
            s3_key = f"iterations/iteration_{iteration}_chest_front.png"
            s3.upload_file(output_path, S3_BUCKET, s3_key)
            s3_url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{s3_key}"

            print(f"✅ Image generated: {output_path}")
            print(f"📎 S3 URL: {s3_url}")

            return output_path, s3_url
        else:
            print(f"❌ No image data in response")
            return None, None

    except Exception as e:
        print(f"❌ Error: {e}")
        return None, None


def main():
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║  🔬 ITERATIVE ANATOMICAL IMAGE IMPROVEMENT                 ║
    ║  Testing 5 prompt variations for fitness app               ║
    ╚════════════════════════════════════════════════════════════╝
    """)

    # Create output directory
    Path('media_output').mkdir(exist_ok=True)

    muscles = TEST_EXERCISE['primaryMuscles'] + TEST_EXERCISE['secondaryMuscles']
    muscle_str = ', '.join(muscles)

    results = []

    for i, prompt_template in enumerate(PROMPT_VARIATIONS, start=1):
        # Fill in template
        prompt = prompt_template.format(
            exercise_name=TEST_EXERCISE['name'],
            muscles=muscle_str
        )

        # Generate image
        local_path, s3_url = generate_image(prompt, i)

        if local_path:
            results.append({
                'iteration': i,
                'prompt': prompt,
                'local_path': local_path,
                's3_url': s3_url
            })

        # Wait between requests
        if i < len(PROMPT_VARIATIONS):
            print("\n⏳ Waiting 3 seconds before next iteration...")
            time.sleep(3)

    # Save results
    print(f"\n\n{'='*60}")
    print("✅ ALL ITERATIONS COMPLETE!")
    print(f"{'='*60}\n")

    with open('media_output/iteration_results.json', 'w') as f:
        json.dump(results, f, indent=2)

    print("📊 Generated 5 variations:")
    for r in results:
        print(f"\n   Iteration {r['iteration']}:")
        print(f"   Local: {r['local_path']}")
        print(f"   S3: {r['s3_url']}")

    print("\n\n🔍 Now review the images to pick the best prompt!")
    print("   Images saved to: media_output/iteration_*.png")


if __name__ == '__main__':
    main()
