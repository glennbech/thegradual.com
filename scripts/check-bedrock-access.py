#!/usr/bin/env python3
"""
Check if AWS Bedrock Nova models are accessible
"""

import boto3
import sys

REGION = 'us-east-2'
REQUIRED_MODELS = [
    'amazon.nova-reel-v1:0',   # Video generation
    'amazon.nova-canvas-v1:0'  # Image generation
]

def check_bedrock_access():
    """Verify access to required Bedrock models"""
    print("🔍 Checking AWS Bedrock access...\n")

    try:
        bedrock = boto3.client('bedrock', region_name=REGION)

        # List foundation models
        response = bedrock.list_foundation_models()
        available_models = {model['modelId'] for model in response['modelSummaries']}

        print("✅ Successfully connected to AWS Bedrock")
        print(f"   Region: {REGION}\n")

        all_accessible = True
        for model_id in REQUIRED_MODELS:
            if model_id in available_models:
                print(f"✅ {model_id} - ACCESSIBLE")
            else:
                print(f"❌ {model_id} - NOT ACCESSIBLE")
                all_accessible = False

        if all_accessible:
            print("\n🎉 All required models are accessible!")
            print("\nYou can now run:")
            print("   python3 generate-exercise-media.py")
            return True
        else:
            print("\n⚠️  Some models are not accessible!")
            print("\n📝 To request access:")
            print("   1. Go to AWS Console → Bedrock → Model Access")
            print("   2. Click 'Request model access'")
            print("   3. Select Amazon Nova Reel and Amazon Nova Canvas")
            print("   4. Submit request (usually approved instantly)")
            return False

    except Exception as e:
        print(f"❌ Error connecting to Bedrock: {e}")
        print("\n📝 Make sure:")
        print("   1. AWS credentials are configured (aws configure)")
        print("   2. You have Bedrock permissions in IAM")
        print("   3. Bedrock is available in us-east-2")
        return False


if __name__ == '__main__':
    success = check_bedrock_access()
    sys.exit(0 if success else 1)
