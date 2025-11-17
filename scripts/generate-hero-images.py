#!/usr/bin/env python3
"""
Generate Hero Images for TheGradual App
Uses Amazon Bedrock Nova Canvas to create diverse, sporty gym-goer images
"""

import boto3
import json
import base64
import os
from datetime import datetime

# Configuration
REGION = "us-east-2"
MODEL_ID = "amazon.nova-canvas-v1:0"
BUCKET_NAME = "thegradual-exercise-media"
OUTPUT_DIR = "hero_output"

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Initialize Bedrock client
bedrock = boto3.client("bedrock-runtime", region_name=REGION)
s3 = boto3.client("s3", region_name=REGION)

def generate_image(prompt, filename):
    """Generate a single image using Nova Canvas"""
    print(f"\n🎨 Generating: {filename}")
    print(f"📝 Prompt: {prompt[:80]}...")

    # Nova Canvas request body
    body = json.dumps({
        "taskType": "TEXT_IMAGE",
        "textToImageParams": {
            "text": prompt,
            "negativeText": "blurry, low quality, watermark, text, logo, brand names, distorted faces, unrealistic proportions, multiple people, crowd"
        },
        "imageGenerationConfig": {
            "numberOfImages": 1,
            "quality": "premium",
            "height": 1024,
            "width": 1024,
            "cfgScale": 8.0,
            "seed": hash(filename) % (2**32)  # Deterministic but unique per image
        }
    })

    try:
        # Invoke Bedrock
        response = bedrock.invoke_model(
            modelId=MODEL_ID,
            body=body
        )

        # Parse response
        response_body = json.loads(response["body"].read())

        # Extract base64 image
        image_base64 = response_body["images"][0]
        image_data = base64.b64decode(image_base64)

        # Save locally
        local_path = os.path.join(OUTPUT_DIR, filename)
        with open(local_path, "wb") as f:
            f.write(image_data)

        print(f"✅ Saved locally: {local_path}")

        # Upload to S3
        s3_key = f"hero/{filename}"
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=image_data,
            ContentType="image/png"
        )

        s3_url = f"https://{BUCKET_NAME}.s3.{REGION}.amazonaws.com/{s3_key}"
        print(f"☁️  Uploaded to S3: {s3_url}")

        return {
            "filename": filename,
            "s3_url": s3_url,
            "local_path": local_path
        }

    except Exception as e:
        print(f"❌ Error generating {filename}: {str(e)}")
        return None

def main():
    print("=" * 80)
    print("🎨 TheGradual Hero Image Generator")
    print("=" * 80)
    print(f"📍 Region: {REGION}")
    print(f"🤖 Model: {MODEL_ID}")
    print(f"🪣 S3 Bucket: {BUCKET_NAME}")
    print(f"📁 Output: {OUTPUT_DIR}/")
    print("=" * 80)

    # Define hero image variations
    # Each represents diverse, sporty individuals in gym attire
    hero_images = [
        {
            "filename": "hero-1-asian-woman.png",
            "prompt": (
                "Professional studio photograph of a confident Asian woman in her late 20s wearing modern athletic gym wear "
                "(black fitted tank top and grey leggings), holding a gym water bottle, standing in a clean white minimalist studio. "
                "She has her hair in a sleek ponytail, wearing white sneakers, with a friendly and determined expression. "
                "Soft professional lighting, high-key photography style similar to Apple product photography. "
                "Shot on Canon EOS R5, 85mm lens, f/2.8, natural skin tones, sharp focus on subject, "
                "pure white background (#FFFFFF), commercial fitness photography aesthetic. "
                "Full body shot with confident posture, looking at camera with motivational energy."
            )
        },
        {
            "filename": "hero-2-black-man.png",
            "prompt": (
                "Professional studio photograph of an athletic Black man in his early 30s wearing sleek gym attire "
                "(navy blue compression shirt and black athletic shorts), holding a small gym towel over shoulder, "
                "standing in a clean white minimalist studio. "
                "He has a fit athletic build, wearing black and white running shoes, with a warm confident smile. "
                "Soft professional lighting, high-key photography style similar to Apple product photography. "
                "Shot on Canon EOS R5, 85mm lens, f/2.8, natural skin tones, sharp focus on subject, "
                "pure white background (#FFFFFF), commercial fitness photography aesthetic. "
                "Full body shot with approachable stance, looking at camera with encouraging energy."
            )
        },
        {
            "filename": "hero-3-latina-woman.png",
            "prompt": (
                "Professional studio photograph of a strong Latina woman in her mid-20s wearing vibrant athletic wear "
                "(coral sports bra and high-waisted black leggings), holding a yoga mat rolled under her arm, "
                "standing in a clean white minimalist studio. "
                "She has long dark hair in a high ponytail, wearing colorful athletic shoes, with a bright energetic smile. "
                "Soft professional lighting, high-key photography style similar to Apple product photography. "
                "Shot on Canon EOS R5, 85mm lens, f/2.8, natural skin tones, sharp focus on subject, "
                "pure white background (#FFFFFF), commercial fitness photography aesthetic. "
                "Full body shot with dynamic stance, looking at camera with joyful fitness energy."
            )
        },
        {
            "filename": "hero-4-white-man.png",
            "prompt": (
                "Professional studio photograph of a fit Caucasian man in his late 20s wearing minimal gym attire "
                "(grey fitted t-shirt and black joggers), holding wireless earbuds in hand, "
                "standing in a clean white minimalist studio. "
                "He has short styled hair, wearing minimal white sneakers, with a focused ready-to-train expression. "
                "Soft professional lighting, high-key photography style similar to Apple product photography. "
                "Shot on Canon EOS R5, 85mm lens, f/2.8, natural skin tones, sharp focus on subject, "
                "pure white background (#FFFFFF), commercial fitness photography aesthetic. "
                "Full body shot with athletic posture, looking at camera with determined motivation."
            )
        }
    ]

    # Generate all images
    results = []
    for config in hero_images:
        result = generate_image(config["prompt"], config["filename"])
        if result:
            results.append(result)

    # Create manifest
    manifest = {
        "generated_at": datetime.now().isoformat(),
        "model": MODEL_ID,
        "bucket": BUCKET_NAME,
        "images": results
    }

    manifest_path = os.path.join(OUTPUT_DIR, "hero-manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    print("\n" + "=" * 80)
    print("✅ GENERATION COMPLETE")
    print("=" * 80)
    print(f"📊 Generated: {len(results)}/{len(hero_images)} images")
    print(f"📄 Manifest: {manifest_path}")
    print("\n🖼️  Image URLs:")
    for result in results:
        print(f"  • {result['filename']}")
        print(f"    {result['s3_url']}")

    print("\n💡 NEXT STEPS:")
    print("1. Review images in hero_output/")
    print("2. Use S3 URLs in your app for rotating hero images")
    print("3. Add to your React component with random rotation")
    print("\n🎨 INTEGRATION EXAMPLE:")
    print("""
const heroImages = [
  'https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/hero/hero-1-asian-woman.png',
  'https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/hero/hero-2-black-man.png',
  'https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/hero/hero-3-latina-woman.png',
  'https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/hero/hero-4-white-man.png'
];

const randomHero = heroImages[Math.floor(Math.random() * heroImages.length)];
    """)
    print("=" * 80)

if __name__ == "__main__":
    main()
