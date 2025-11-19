# Quick Deployment Guide

## Current Status

✅ **All Lambda artifacts deployed to S3**
✅ **Terraform configuration ready**

## What You Have

Based on your setup, you already have:
- Cognito Client ID: `77efo2uje76pge8egkihhj8jvm`
- Cognito Client Secret: Stored in `/thegradual/client_secret`

## Option 1: Deploy WITHOUT Google OAuth (Email/Password Only)

If you want to deploy with just email/password authentication (no Google sign-in):

```bash
cd infra
terraform init
terraform plan
terraform apply
```

That's it! The app will support:
- ✅ Email/password signup
- ✅ Email/password login
- ❌ Google OAuth (not configured)

## Option 2: Deploy WITH Google OAuth

If you want Google sign-in, you need to:

### Step 1: Store Google OAuth Secret

```bash
# Store your Google OAuth client secret
aws ssm put-parameter \
  --name "/thegradual/google_oauth_secret" \
  --type "SecureString" \
  --value "YOUR-GOOGLE-OAUTH-CLIENT-SECRET-HERE" \
  --region us-east-2
```

### Step 2: Deploy with Google Client ID

```bash
cd infra
terraform init

# Replace with your actual Google OAuth client ID
terraform apply -var="google_client_id=YOUR-GOOGLE-CLIENT-ID.apps.googleusercontent.com"
```

The app will support:
- ✅ Email/password signup
- ✅ Email/password login
- ✅ Google OAuth sign-in

## After Terraform Apply

### Get Configuration Values for Frontend

```bash
cd infra

# Save all outputs
terraform output -json > ../frontend-config.json

# Display key values
echo "=== Cognito Configuration ==="
echo "User Pool ID: $(terraform output -raw cognito_user_pool_id)"
echo "Identity Pool ID: $(terraform output -raw cognito_identity_pool_id)"
echo "Client ID: $(terraform output -raw cognito_client_id)"
echo "Cognito Domain: $(terraform output -raw cognito_user_pool_domain)"
echo "BFF Lambda URL: $(terraform output -raw bff_lambda_url)"
```

### Update Google OAuth Redirect URIs (if using Google)

After Terraform creates the Cognito domain, update your Google OAuth client:

1. Get Cognito domain:
   ```bash
   cd infra
   terraform output cognito_user_pool_domain
   ```

2. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)

3. Edit your OAuth 2.0 Client ID

4. Add to **Authorized redirect URIs**:
   ```
   https://<COGNITO_DOMAIN_FROM_OUTPUT>/oauth2/idpresponse
   ```

## Test Backend

```bash
# Get BFF URL
BFF_URL=$(cd infra && terraform output -raw bff_lambda_url)

# Test health endpoint
curl "${BFF_URL}/health"

# Expected: {"status":"ok"}
```

## What's Next?

After Terraform is deployed:
1. Frontend integration (AuthContext, syncService, etc.)
2. Update Google OAuth redirect URIs
3. Test the complete auth flow

## Troubleshooting

### If Terraform fails with "client already exists"

The client `77efo2uje76pge8egkihhj8jvm` may already be associated with another User Pool. You have two options:

**Option A**: Import the existing client
```bash
cd infra
terraform import aws_cognito_user_pool_client.server \
  <USER_POOL_ID>/77efo2uje76pge8egkihhj8jvm
```

**Option B**: Let Terraform create a new client
Comment out the `resource "aws_cognito_user_pool_client" "server"` block and let Terraform create a new one.

### If you don't have Google OAuth credentials

No problem! Just deploy without the Google client ID:

```bash
cd infra
terraform apply
# (Don't provide google_client_id variable)
```

Users can still sign up with email/password.
