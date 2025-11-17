#!/usr/bin/env python3
"""
Round 2: Simplified prompts focusing on app icon style
Avoid mentioning exercise names, focus on pure muscle highlighting
"""

import boto3
import json
import time
from pathlib import Path

BEDROCK_REGION = 'us-east-1'
S3_REGION = 'us-east-2'
S3_BUCKET = 'thegradual-exercise-media'
MODEL_ID_IMAGE = 'amazon.nova-canvas-v1:0'

bedrock = boto3.client('bedrock-runtime', region_name=BEDROCK_REGION)
s3 = boto3.client('s3', region_name=S3_REGION)

# Round 2: Simpler prompts (NO exercise names)
PROMPT_VARIATIONS_V2 = [
    # Iteration 6: Pure silhouette style
    """Fitness app icon. Simple silhouette of human body, front view, standing. Chest and shoulder muscles highlighted in solid bright red. Rest of body in light gray. Pure white background. Flat design, minimal style. No details, no face, no equipment.""",

    # Iteration 7: Flat vector style
    """Vector graphic for workout app. Front view body silhouette. Red fill on: chest area, front shoulders, upper arms. Gray fill on rest of body. White background. Simple shapes, no gradients. Like app store fitness icons.""",

    # Iteration 8: Heat map style
    """Muscle heat map graphic. Simple standing figure, front view. Bright red overlay on chest, shoulders, arms. Light gray body outline. White clean background. Fitness tracker style visualization. Minimalist, bold colors only.""",

    # Iteration 9: Color block diagram
    """Fitness app muscle diagram. Basic human body shape, front facing. Color blocks: RED (chest, front shoulders, triceps area), GRAY (everything else). White background. Simple geometric style like Apple Health app.""",

    # Iteration 10: Minimal icon
    """Workout app muscle icon. Front body outline, minimal detail. Solid red: pecs, deltoids, triceps. Solid light gray: other muscles. White background. Ultra simple, instantly readable at small sizes. No text, no labels, no face detail."""
]


def generate_image_v2(prompt, iteration):
    """Generate image with Nova Canvas"""
    print(f"\n{'='*60}")
    print(f"🎨 ITERATION {iteration}/10 (Round 2)")
    print(f"{'='*60}")
    print(f"Prompt: {prompt[:150]}...")

    request_body = {
        "taskType": "TEXT_IMAGE",
        "textToImageParams": {
            "text": prompt,
            "negativeText": "photo, photograph, realistic, 3D render, muscle fiber detail, striations, medical illustration, anatomy textbook, equipment, barbell, bench, gym, person exercising, action pose, detailed face"
        },
        "imageGenerationConfig": {
            "numberOfImages": 1,
            "height": 1024,
            "width": 1024,
            "cfgScale": 8.0,
            "seed": iteration + 100
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
            output_path = f"media_output/iteration_{iteration}_v2_chest_front.png"
            with open(output_path, 'wb') as f:
                f.write(base64.b64decode(images[0]))

            s3_key = f"iterations/iteration_{iteration}_v2_chest_front.png"
            s3.upload_file(output_path, S3_BUCKET, s3_key)
            s3_url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{s3_key}"

            print(f"✅ Image generated: {output_path}")
            print(f"📎 S3 URL: {s3_url}")

            return output_path, s3_url
        else:
            print(f"❌ No image in response")
            return None, None

    except Exception as e:
        print(f"❌ Error: {e}")
        return None, None


def main():
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║  🔬 ROUND 2: SIMPLIFIED ICON-STYLE PROMPTS                 ║
    ║  No exercise names, focus on pure visual style             ║
    ╚════════════════════════════════════════════════════════════╝
    """)

    Path('media_output').mkdir(exist_ok=True)

    results = []

    for i, prompt in enumerate(PROMPT_VARIATIONS_V2, start=6):
        local_path, s3_url = generate_image_v2(prompt, i)

        if local_path:
            results.append({
                'iteration': i,
                'prompt': prompt,
                'local_path': local_path,
                's3_url': s3_url
            })

        if i < 10:
            print("\n⏳ Waiting 3 seconds...")
            time.sleep(3)

    print(f"\n\n{'='*60}")
    print("✅ ROUND 2 COMPLETE!")
    print(f"{'='*60}\n")

    with open('media_output/iteration_v2_results.json', 'w') as f:
        json.dump(results, f, indent=2)

    print("📊 Generated 5 more variations:")
    for r in results:
        print(f"\n   Iteration {r['iteration']}:")
        print(f"   Local: {r['local_path']}")
        print(f"   S3: {r['s3_url']}")

    print("\n\n🔍 Review iterations 6-10 to find best style!")


if __name__ == '__main__':
    main()
