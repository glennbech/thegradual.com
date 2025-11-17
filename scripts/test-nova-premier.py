#!/usr/bin/env python3
"""
Test AWS Bedrock Nova Premier access and capabilities
"""

import boto3
import json

REGION = 'us-east-2'

# Try different Nova Premier model IDs
NOVA_PREMIER_IDS = [
    'amazon.nova-premier-v1:0',
    'amazon.nova-pro-v1:0',
    'amazon.nova-lite-v1:0',
    'us.amazon.nova-premier-v1:0',
    'us.amazon.nova-pro-v1:0',
]

def list_available_models():
    """List all available Bedrock models"""
    print("🔍 Listing all available Bedrock models...\n")

    try:
        bedrock = boto3.client('bedrock', region_name=REGION)
        response = bedrock.list_foundation_models()

        print(f"Found {len(response['modelSummaries'])} total models\n")

        # Filter for Nova models
        nova_models = [m for m in response['modelSummaries'] if 'nova' in m['modelId'].lower()]

        if nova_models:
            print("🌟 Available Nova Models:")
            for model in nova_models:
                print(f"  ✓ {model['modelId']}")
                print(f"    Name: {model.get('modelName', 'N/A')}")
                print(f"    Provider: {model.get('providerName', 'N/A')}")
                print()
        else:
            print("❌ No Nova models found")
            print("\nAll models starting with 'amazon':")
            amazon_models = [m for m in response['modelSummaries'] if m['modelId'].startswith('amazon')]
            for model in amazon_models[:10]:  # Show first 10
                print(f"  • {model['modelId']}")

        return nova_models

    except Exception as e:
        print(f"❌ Error: {e}")
        return []

def test_nova_premier_text():
    """Test Nova Premier with a simple text generation"""
    print("\n" + "="*60)
    print("🧪 Testing Nova Premier for text generation...")
    print("="*60 + "\n")

    bedrock_runtime = boto3.client('bedrock-runtime', region_name=REGION)

    for model_id in NOVA_PREMIER_IDS:
        print(f"\nTrying model: {model_id}")
        try:
            # Simple text prompt
            prompt = "Describe a barbell bench press exercise in one sentence."

            request_body = {
                "messages": [
                    {
                        "role": "user",
                        "content": [{"text": prompt}]
                    }
                ],
                "inferenceConfig": {
                    "maxTokens": 100,
                    "temperature": 0.7
                }
            }

            response = bedrock_runtime.invoke_model(
                modelId=model_id,
                body=json.dumps(request_body)
            )

            response_body = json.loads(response['body'].read())
            print(f"✅ SUCCESS with {model_id}!")
            print(f"Response: {response_body}")
            return model_id

        except Exception as e:
            error_msg = str(e)
            if "ResourceNotFoundException" in error_msg or "not found" in error_msg.lower():
                print(f"  ⚠️  Model not found: {model_id}")
            elif "AccessDeniedException" in error_msg or "access" in error_msg.lower():
                print(f"  ⚠️  Access denied - need to request access for: {model_id}")
            else:
                print(f"  ❌ Error: {error_msg}")

    print("\n❌ None of the Nova Premier model IDs worked")
    return None

if __name__ == '__main__':
    print("""
    ╔════════════════════════════════════════════════════════════╗
    ║  🧪 BEDROCK NOVA PREMIER TEST                              ║
    ╚════════════════════════════════════════════════════════════╝
    """)

    # List available models
    nova_models = list_available_models()

    # Test Nova Premier
    working_model = test_nova_premier_text()

    if working_model:
        print(f"\n\n✅ Found working model: {working_model}")
        print("\nYou can use this model ID in the generation script!")
    else:
        print("\n\n⚠️  No working Nova models found")
        print("\nNext steps:")
        print("1. Check if you have access to any Nova models in AWS Console")
        print("2. Request access if needed")
        print("3. Models might have different names in your region")
