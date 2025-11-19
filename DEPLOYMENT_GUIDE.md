# TheGradual - Cognito Deployment Guide

This guide walks you through deploying the Cognito authentication infrastructure for TheGradual.

## Prerequisites

- AWS CLI configured with credentials
- Terraform installed (v1.0+)
- Go 1.21+ installed
- Node.js 18+ installed
- Access to Google Cloud Console (for OAuth)

## Step 1: Set Up Google OAuth

### 1.1 Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing: "TheGradual"
3. Navigate to: **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client ID**
5. Configure OAuth consent screen (if not done):
   - User Type: External
   - App name: TheGradual
   - Support email: your-email@example.com
   - Authorized domains: `thegradual.com`
6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: `TheGradual Web Client`
   - Authorized redirect URIs:
     ```
     https://thegradual-auth.auth.us-east-2.amazoncognito.com/oauth2/idpresponse
     http://localhost:5555
     ```
7. **Save the Client ID and Client Secret**

### 1.2 Store Google OAuth Secret in AWS

```bash
# Store Google OAuth client secret
aws ssm put-parameter \
  --name "/thegradual.com/google_oauth/client_secret" \
  --type "SecureString" \
  --value "YOUR-GOOGLE-CLIENT-SECRET-HERE" \
  --region us-east-2

# Verify it was stored
aws ssm get-parameter \
  --name "/thegradual.com/google_oauth/client_secret" \
  --with-decryption \
  --region us-east-2 \
  --query "Parameter.Value" \
  --output text
```

## Step 2: Build Lambda Functions

### Option A: Build All Lambdas at Once (Recommended)

```bash
# From project root
make build-lambda
```

This builds all 4 Lambda functions:
- `lambda-user-state` - User data API
- `lambda-bff` - Auth backend-for-frontend
- `lambda-cognito-postconfirm` - Post-signup trigger
- `lambda-pre-token-generation` - JWT claims trigger

### Option B: Build Individual Lambdas

```bash
# User state API
cd lambda-user-state
make build
cd ..

# BFF (Backend-for-Frontend)
cd lambda-bff
make build
cd ..

# Post-confirmation trigger
cd lambda-cognito-postconfirm
make build
cd ..

# Pre-token generation trigger
cd lambda-pre-token-generation
make build
cd ..
```

### Verify Builds

```bash
# Check that all bootstrap binaries were created
ls -lh lambda-*/bootstrap

# Should show 4 files:
# lambda-bff/bootstrap
# lambda-cognito-postconfirm/bootstrap
# lambda-pre-token-generation/bootstrap
# lambda-user-state/bootstrap
```

## Step 3: Deploy Lambda Functions to S3

### Deploy All Lambdas

```bash
# From project root
make deploy-lambda
```

This will:
1. Build all Lambda functions
2. Package each into a ZIP file
3. Upload to S3: `s3://lambda-artifacts-us-east-2-{YOUR-ACCOUNT-ID}/lambda/`

### Verify S3 Uploads

```bash
# Get your AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# List uploaded Lambda artifacts
aws s3 ls s3://lambda-artifacts-us-east-2-${AWS_ACCOUNT_ID}/lambda/

# Should show:
# bff.zip
# cognito-postconfirm.zip
# pre-token-generation.zip
# user-state.zip
```

## Step 4: Deploy Terraform Infrastructure

### 4.1 Initialize Terraform

```bash
cd infra
terraform init
```

### 4.2 Plan Infrastructure Changes

```bash
# Replace with your actual Google OAuth client ID
export TF_VAR_google_client_id="YOUR-GOOGLE-CLIENT-ID.apps.googleusercontent.com"

terraform plan
```

Review the plan. You should see:
- Cognito User Pool
- Cognito Identity Pool
- Cognito User Pool Client
- Google Identity Provider
- 3 new Lambda functions (BFF, post-confirm, pre-token)
- IAM roles for authenticated/unauthenticated users
- Lambda Function URLs

### 4.3 Apply Infrastructure

```bash
terraform apply -var="google_client_id=${TF_VAR_google_client_id}"
```

Type `yes` when prompted.

### 4.4 Save Terraform Outputs

```bash
# Save all outputs to JSON for frontend configuration
terraform output -json > outputs.json

# Display key outputs
echo "User Pool ID:"
terraform output cognito_user_pool_id

echo "Identity Pool ID:"
terraform output cognito_identity_pool_id

echo "Client ID:"
terraform output cognito_client_id

echo "Cognito Domain:"
terraform output cognito_user_pool_domain

echo "BFF Lambda URL:"
terraform output bff_lambda_url
```

## Step 5: Update Google OAuth Redirect URIs

After Terraform creates the Cognito domain, you need to update Google OAuth:

### 5.1 Get Cognito Domain

```bash
cd infra
COGNITO_DOMAIN=$(terraform output -raw cognito_user_pool_domain)
echo "Cognito Domain: https://${COGNITO_DOMAIN}"
```

### 5.2 Update Google OAuth Client

1. Go back to Google Cloud Console
2. Navigate to: **APIs & Services > Credentials**
3. Click on your OAuth 2.0 Client ID
4. Update **Authorized redirect URIs**:
   ```
   https://<COGNITO_DOMAIN>/oauth2/idpresponse
   https://thegradual.com
   https://www.thegradual.com
   http://localhost:5555
   ```
5. Click **Save**

## Step 6: Test Backend Infrastructure

### 6.1 Test BFF Lambda

```bash
BFF_URL=$(cd infra && terraform output -raw bff_lambda_url)

# Test health check
curl "${BFF_URL}/health"

# Expected response:
# {"status":"ok"}
```

### 6.2 Test User State Lambda

```bash
API_URL=$(cd infra && terraform output -raw api_gateway_url)

# Test retrieving user state (will be empty for new user)
curl "${API_URL}" -H "Content-Type: application/json"
```

## Step 7: Configure Frontend (TODO - Next Phase)

The frontend integration is not yet complete. This will involve:

1. **Install AWS SDK dependencies**:
   ```bash
   npm install @aws-sdk/client-cognito-identity \
               @aws-sdk/client-dynamodb \
               @aws-sdk/lib-dynamodb \
               @aws-sdk/credential-providers \
               amazon-cognito-identity-js
   ```

2. **Create `src/config/aws.ts`** with values from Terraform outputs

3. **Implement AuthContext** for Cognito Identity Pool integration

4. **Create syncService** to replace localStorage with DynamoDB

5. **Build UI components** (AuthButton, Profile page)

## Useful Commands

### View Lambda Logs

```bash
# BFF Lambda
aws logs tail /aws/lambda/thegradual-bff --follow --region us-east-2

# Post-confirmation trigger
aws logs tail /aws/lambda/thegradual-post-confirmation --follow --region us-east-2

# Pre-token generation
aws logs tail /aws/lambda/thegradual-pre-token-generation --follow --region us-east-2

# User state API
aws logs tail /aws/lambda/thegradual-user-state --follow --region us-east-2
```

### Update Lambda Code (After Changes)

```bash
# Update all Lambdas at once
make update-lambda

# Or update individual Lambda
cd lambda-bff
make update-lambda
```

### Clean Build Artifacts

```bash
# Clean all Lambda artifacts
make clean-lambda

# Clean specific Lambda
cd lambda-bff
make clean
```

## Troubleshooting

### Issue: Terraform can't find Lambda artifacts

**Error**: `Error putting S3 object: NoSuchKey`

**Solution**: Make sure you ran `make deploy-lambda` before `terraform apply`

```bash
# Deploy lambdas first
make deploy-lambda

# Then apply Terraform
cd infra && terraform apply
```

### Issue: Google OAuth redirect error

**Error**: `redirect_uri_mismatch`

**Solution**: Update Google OAuth authorized redirect URIs to include Cognito domain

1. Get Cognito domain: `cd infra && terraform output cognito_user_pool_domain`
2. Add to Google OAuth: `https://<domain>/oauth2/idpresponse`

### Issue: Lambda environment variables not set

**Error**: `Missing required environment variables`

**Solution**: Terraform injects environment variables automatically. If using `make update-lambda`, the environment variables from Terraform are preserved.

### Issue: Can't access SSM parameter

**Error**: `ParameterNotFound`

**Solution**: Ensure Google OAuth secret was stored in correct parameter name

```bash
# Check if parameter exists
aws ssm get-parameter \
  --name "/thegradual.com/google_oauth/client_secret" \
  --region us-east-2
```

## Next Steps

1. ✅ Backend infrastructure deployed
2. ✅ Lambda functions built and uploaded
3. ✅ Cognito User Pool and Identity Pool created
4. ✅ Google OAuth configured
5. ⏳ Frontend integration (next phase)
6. ⏳ Testing and validation

## Architecture Summary

```
User opens app
  ↓
Cognito Identity Pool → Anonymous Identity ID
  ↓
Data stored in DynamoDB (keyed by Identity ID)
  ↓
[Optional] User clicks "Sign In"
  ↓
Cognito Hosted UI → Google OAuth OR Email/Password
  ↓
Callback with authorization code
  ↓
BFF Lambda exchanges code for tokens (httpOnly cookie)
  ↓
Identity upgraded to authenticated (SAME Identity ID!)
  ↓
Data automatically preserved
```

## Resources

- [AWS Cognito Identity Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-identity.html)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Terraform AWS Provider - Cognito](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool)
