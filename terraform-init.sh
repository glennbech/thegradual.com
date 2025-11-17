#!/bin/bash

set -e  # Exit on any error

# Configuration
REGION="us-east-2"
STATE_BUCKET_NAME="thegradual-tf-state-v2"

# Get AWS account ID
echo "Getting AWS account ID..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "✓ Account ID: $ACCOUNT_ID"
echo ""

# Lambda artifacts bucket name
ARTIFACTS_BUCKET_NAME="lambda-artifacts-${REGION}-${ACCOUNT_ID}"

echo "=============================================="
echo "AWS Infrastructure Bucket Initialization"
echo "=============================================="
echo ""
echo "Buckets to create:"
echo "  1. Terraform State: $STATE_BUCKET_NAME"
echo "  2. Lambda Artifacts: $ARTIFACTS_BUCKET_NAME"
echo "Region: $REGION"
echo ""

# Function to create and configure an S3 bucket (idempotent)
create_bucket() {
    local BUCKET_NAME=$1
    local ENABLE_VERSIONING=$2  # "true" or "false"
    local ENABLE_LIFECYCLE=$3   # "true" or "false"

    echo "----------------------------------------------"
    echo "Processing bucket: $BUCKET_NAME"
    echo "----------------------------------------------"

    # Check if bucket already exists
    if aws s3api head-bucket --bucket "$BUCKET_NAME" --region "$REGION" 2>/dev/null; then
        echo "✓ Bucket '$BUCKET_NAME' already exists"
    else
        echo "Creating bucket '$BUCKET_NAME'..."
        aws s3api create-bucket \
            --bucket "$BUCKET_NAME" \
            --region "$REGION" \
            --create-bucket-configuration LocationConstraint="$REGION"
        echo "✓ Bucket created"
    fi

    echo ""

    # Check and configure versioning (if requested)
    if [ "$ENABLE_VERSIONING" == "true" ]; then
        VERSIONING=$(aws s3api get-bucket-versioning --bucket "$BUCKET_NAME" --region "$REGION" --query 'Status' --output text 2>/dev/null || echo "None")

        if [ "$VERSIONING" == "Enabled" ]; then
            echo "✓ Versioning: Already enabled"
        else
            echo "⚠ Versioning: Not enabled - Enabling now..."
            aws s3api put-bucket-versioning \
                --bucket "$BUCKET_NAME" \
                --region "$REGION" \
                --versioning-configuration Status=Enabled
            echo "✓ Versioning: Enabled"
        fi
    else
        echo "○ Versioning: Skipped (not requested)"
    fi

    # Check and configure encryption
    if aws s3api get-bucket-encryption --bucket "$BUCKET_NAME" --region "$REGION" >/dev/null 2>&1; then
        echo "✓ Encryption: Already enabled"
    else
        echo "⚠ Encryption: Not enabled - Enabling now..."
        aws s3api put-bucket-encryption \
            --bucket "$BUCKET_NAME" \
            --region "$REGION" \
            --server-side-encryption-configuration '{
                "Rules": [{
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    },
                    "BucketKeyEnabled": true
                }]
            }'
        echo "✓ Encryption: Enabled"
    fi

    # Check and configure public access block
    PUBLIC_ACCESS=$(aws s3api get-public-access-block --bucket "$BUCKET_NAME" --region "$REGION" 2>/dev/null || echo "")

    if echo "$PUBLIC_ACCESS" | grep -q "BlockPublicAcls"; then
        # Check if all settings are true
        BLOCK_PUBLIC_ACLS=$(echo "$PUBLIC_ACCESS" | grep -o '"BlockPublicAcls": [^,}]*' | grep -o 'true\|false')
        IGNORE_PUBLIC_ACLS=$(echo "$PUBLIC_ACCESS" | grep -o '"IgnorePublicAcls": [^,}]*' | grep -o 'true\|false')
        BLOCK_PUBLIC_POLICY=$(echo "$PUBLIC_ACCESS" | grep -o '"BlockPublicPolicy": [^,}]*' | grep -o 'true\|false')
        RESTRICT_PUBLIC_BUCKETS=$(echo "$PUBLIC_ACCESS" | grep -o '"RestrictPublicBuckets": [^,}]*' | grep -o 'true\|false')

        if [ "$BLOCK_PUBLIC_ACLS" == "true" ] && \
           [ "$IGNORE_PUBLIC_ACLS" == "true" ] && \
           [ "$BLOCK_PUBLIC_POLICY" == "true" ] && \
           [ "$RESTRICT_PUBLIC_BUCKETS" == "true" ]; then
            echo "✓ Public Access Block: Already configured"
        else
            echo "⚠ Public Access Block: Incomplete configuration - Updating now..."
            aws s3api put-public-access-block \
                --bucket "$BUCKET_NAME" \
                --region "$REGION" \
                --public-access-block-configuration \
                    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
            echo "✓ Public Access Block: Configured"
        fi
    else
        echo "⚠ Public Access Block: Not configured - Enabling now..."
        aws s3api put-public-access-block \
            --bucket "$BUCKET_NAME" \
            --region "$REGION" \
            --public-access-block-configuration \
                "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
        echo "✓ Public Access Block: Configured"
    fi

    # Check and configure lifecycle policy (if requested)
    if [ "$ENABLE_LIFECYCLE" == "true" ]; then
        LIFECYCLE=$(aws s3api get-bucket-lifecycle-configuration --bucket "$BUCKET_NAME" --region "$REGION" 2>/dev/null || echo "")

        if echo "$LIFECYCLE" | grep -q "DeleteOldVersions"; then
            echo "✓ Lifecycle Policy: Already configured"
        else
            echo "⚠ Lifecycle Policy: Not configured - Configuring now..."
            aws s3api put-bucket-lifecycle-configuration \
                --bucket "$BUCKET_NAME" \
                --region "$REGION" \
                --lifecycle-configuration '{
                    "Rules": [{
                        "ID": "DeleteOldVersions",
                        "Filter": {},
                        "Status": "Enabled",
                        "NoncurrentVersionExpiration": {
                            "NoncurrentDays": 90
                        },
                        "AbortIncompleteMultipartUpload": {
                            "DaysAfterInitiation": 7
                        }
                    }]
                }'
            echo "✓ Lifecycle Policy: Configured (90-day retention)"
        fi
    else
        echo "○ Lifecycle Policy: Skipped (not requested)"
    fi

    echo ""
}

# Create Terraform state bucket (with versioning and lifecycle)
create_bucket "$STATE_BUCKET_NAME" "true" "true"

# Create Lambda artifacts bucket (without versioning, no lifecycle)
create_bucket "$ARTIFACTS_BUCKET_NAME" "false" "false"

echo "=============================================="
echo "✓ All buckets are ready!"
echo "=============================================="
echo ""
echo "Terraform State Bucket:"
echo "  • Name: $STATE_BUCKET_NAME"
echo "  • Region: $REGION"
echo "  • Versioning: Enabled"
echo "  • Encryption: AES256"
echo "  • Public Access: Blocked"
echo "  • Old Versions: Deleted after 90 days"
echo ""
echo "Lambda Artifacts Bucket:"
echo "  • Name: $ARTIFACTS_BUCKET_NAME"
echo "  • Region: $REGION"
echo "  • Versioning: Disabled"
echo "  • Encryption: AES256"
echo "  • Public Access: Blocked"
echo ""
echo "Next steps:"
echo "  1. cd lambda-user-state"
echo "  2. make package"
echo "  3. cd ../terraform"
echo "  4. terraform init"
echo "  5. terraform plan"
echo "  6. terraform apply"
echo ""
