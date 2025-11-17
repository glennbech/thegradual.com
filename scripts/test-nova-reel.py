#!/usr/bin/env python3
"""
Test AWS Bedrock Nova Reel access for video generation
"""

import boto3
import json

REGION = 'us-east-2'

# Possible Nova Reel model IDs
NOVA_REEL_IDS = [
    'amazon.nova-reel-v1:0',
    'us.amazon.nova-reel-v1:0',
    'amazon.nova-reel-v1',
]

# Possible Nova Canvas model IDs
NOVA_CANVAS_IDS = [
    'amazon.nova-canvas-v1:0',
    'us.amazon.nova-canvas-v1:0',
    'amazon.nova-canvas-v1',
]

def check_nova_video_models():
    """Check which Nova video/image models are available"""
    print("🔍 Checking for Nova Reel (video) and Canvas (image) models...\n")

    try:
        bedrock = boto3.client('bedrock', region_name=REGION)
        response = bedrock.list_foundation_models()

        # Look for video and image generation models
        video_models = []
        image_models = []

        for model in response['modelSummaries']:
            model_id = model['modelId']
            model_name = model.get('modelName', '')

            if 'reel' in model_id.lower() or 'video' in model_name.lower():
                video_models.append(model)
                print(f"📹 Video Model Found: {model_id}")
                print(f"   Name: {model_name}")
                print(f"   Modalities: {model.get('outputModalities', [])}")
                print()

            if 'canvas' in model_id.lower() or ('image' in model_name.lower() and 'nova' in model_id.lower()):
                image_models.append(model)
                print(f"🎨 Image Model Found: {model_id}")
                print(f"   Name: {model_name}")
                print(f"   Modalities: {model.get('outputModalities', [])}")
                print()

        if not video_models:
            print("❌ No Nova Reel (video) models found")
        if not image_models:
            print("❌ No Nova Canvas (image) models found")

        return video_models, image_models

    except Exception as e:
        print(f"❌ Error: {e}")
        return [], []


def test_nova_reel():
    """Test Nova Reel video generation with simple prompt"""
    print("\n" + "="*60)
    print("🎬 Testing Nova Reel for video generation...")
    print("="*60 + "\n")

    bedrock_runtime = boto3.client('bedrock-runtime', region_name=REGION)

    for model_id in NOVA_REEL_IDS:
        print(f"\nTrying model: {model_id}")
        try:
            # Simple video generation prompt
            prompt = "A person performing a barbell bench press exercise in a white studio with professional lighting."

            request_body = {
                "taskType": "TEXT_VIDEO",
                "textToVideoParams": {
                    "text": prompt,
                },
                "videoGenerationConfig": {
                    "durationSeconds": 6,
                    "fps": 24,
                    "dimension": "1280x720",
                    "seed": 42
                }
            }

            print("  Sending request... (this may take 2-3 minutes)")
            response = bedrock_runtime.invoke_model(
                modelId=model_id,
                body=json.dumps(request_body)
            )

            response_body = json.loads(response['body'].read())

            if 'video' in response_body or 'output' in response_body:
                print(f"✅ SUCCESS with {model_id}!")
                print(f"  Response keys: {response_body.keys()}")
                return model_id
            else:
                print(f"  ⚠️  Unexpected response format: {response_body.keys()}")

        except Exception as e:
            error_msg = str(e)
            if "ResourceNotFoundException" in error_msg or "not found" in error_msg.lower():
                print(f"  ⚠️  Model not found: {model_id}")
            elif "AccessDeniedException" in error_msg or "access" in error_msg.lower():
                print(f"  🔒 Access denied - need to request access for: {model_id}")
                print(f"     Error: {error_msg}")
            elif "ValidationException" in error_msg:
                print(f"  ⚠️  Validation error: {error_msg}")
            else:
                print(f"  ❌ Error: {error_msg}")

    print("\n❌ None of the Nova Reel model IDs worked")
    return None


def test_nova_canvas():
    """Test Nova Canvas image generation with simple prompt"""
    print("\n" + "="*60)
    print("🎨 Testing Nova Canvas for image generation...")
    print("="*60 + "\n")

    bedrock_runtime = boto3.client('bedrock-runtime', region_name=REGION)

    for model_id in NOVA_CANVAS_IDS:
        print(f"\nTrying model: {model_id}")
        try:
            # Simple image generation prompt
            prompt = "A medical illustration of human chest muscles highlighted in bright red on a white background."

            request_body = {
                "taskType": "TEXT_IMAGE",
                "textToImageParams": {
                    "text": prompt,
                },
                "imageGenerationConfig": {
                    "numberOfImages": 1,
                    "height": 512,
                    "width": 512,
                    "cfgScale": 8.0,
                    "seed": 42
                }
            }

            print("  Sending request...")
            response = bedrock_runtime.invoke_model(
                modelId=model_id,
                body=json.dumps(request_body)
            )

            response_body = json.loads(response['body'].read())

            if 'images' in response_body or 'output' in response_body:
                print(f"✅ SUCCESS with {model_id}!")
                print(f"  Response keys: {response_body.keys()}")
                return model_id
            else:
                print(f"  ⚠️  Unexpected response format: {response_body.keys()}")

        except Exception as e:
            error_msg = str(e)
            if "ResourceNotFoundException" in error_msg or "not found" in error_msg.lower():
                print(f"  ⚠️  Model not found: {model_id}")
            elif "AccessDeniedException" in error_msg or "access" in error_msg.lower():
                print(f"  🔒 Access denied - need to request access for: {model_id}")
                print(f"     Error: {error_msg}")
            elif "ValidationException" in error_msg:
                print(f"  ⚠️  Validation error: {error_msg}")
            else:
                print(f"  ❌ Error: {error_msg}")

    print("\n❌ None of the Nova Canvas model IDs worked")
    return None


if __name__ == '__main__':
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║  🎬 BEDROCK NOVA REEL & CANVAS TEST                        ║
    ╚════════════════════════════════════════════════════════════╝
    """)

    # Check what's available
    video_models, image_models = check_nova_video_models()

    # Test video generation
    working_video_model = test_nova_reel()

    # Test image generation
    working_image_model = test_nova_canvas()

    print("\n\n" + "="*60)
    print("📊 SUMMARY")
    print("="*60)

    if working_video_model:
        print(f"✅ Video (Nova Reel): {working_video_model}")
    else:
        print("❌ Video (Nova Reel): NOT ACCESSIBLE")
        print("   → Request access in AWS Console")

    if working_image_model:
        print(f"✅ Image (Nova Canvas): {working_image_model}")
    else:
        print("❌ Image (Nova Canvas): NOT ACCESSIBLE")
        print("   → Request access in AWS Console")

    if working_video_model and working_image_model:
        print("\n🎉 Both models work! Ready to generate exercise media!")
    else:
        print("\n⚠️  Need to enable model access in AWS Console:")
        print("   https://us-east-2.console.aws.amazon.com/bedrock/home?region=us-east-2#/modelaccess")
