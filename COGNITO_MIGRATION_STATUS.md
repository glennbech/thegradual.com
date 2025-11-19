# Cognito Authentication Migration - Status

## Completed Tasks ✅

### 1. Terraform Infrastructure (Backend)
- ✅ Created `infra/cognito.tf` - Cognito User Pool, Identity Pool, IAM roles
- ✅ Created `infra/lambda_bff.tf` - BFF Lambda infrastructure
- ✅ Created `infra/lambda_cognito_triggers.tf` - Post-confirmation & Pre-token generation triggers
- ✅ Updated `infra/outputs.tf` - Added Cognito outputs for frontend configuration
- ✅ Updated `infra/variables.tf` - Added Google OAuth and callback URL variables

### 2. Lambda Functions (Backend)
- ✅ Copied `lambda-bff/` from Sharewaves (OAuth token exchange, refresh, logout)
- ✅ Copied `lambda-cognito-postconfirm/` from Sharewaves
- ✅ Updated post-confirmation lambda to remove beta program logic (all users → "free" plan)
- ✅ Copied `lambda-pre-token-generation/` from Sharewaves (adds `plan` claim to JWT)

## What's Been Built

### Architecture Overview
```
┌─────────────────────────────────────────────────────────┐
│ Frontend (React SPA)                                     │
│ - Anonymous users: Get Cognito Identity Pool ID         │
│ - Authenticated users: OAuth flow → BFF → JWT tokens    │
└──────────┬──────────────────────────────────────────────┘
           │
           ├──> Cognito Identity Pool (anonymous + authenticated)
           │    - Anonymous IAM role → DynamoDB access
           │    - Authenticated IAM role → DynamoDB access
           │
           ├──> BFF Lambda (Backend-for-Frontend)
           │    - POST /auth/login (exchange code for tokens)
           │    - POST /auth/refresh (refresh access token)
           │    - POST /auth/logout (clear session)
           │
           ├──> Cognito User Pool
           │    - Email/password authentication
           │    - Google OAuth provider
           │    - Custom attribute: plan (free/premium)
           │
           └──> DynamoDB (thegradual-user-states table)
                - Keyed by Cognito Identity ID
                - Works for both anonymous and authenticated users
```

## Remaining Tasks 📋

### Phase 1: Prerequisites
1. **Set up Google OAuth credentials**
   ```bash
   # Store Google client secret in Parameter Store
   aws ssm put-parameter \
     --name "/thegradual.com/google_oauth/client_secret" \
     --type "SecureString" \
     --value "YOUR-GOOGLE-CLIENT-SECRET" \
     --region us-east-2
   ```

2. **Build and upload Lambda functions**
   ```bash
   # Build BFF Lambda
   cd lambda-bff
   GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -tags lambda.norpc -ldflags="-s -w" -o bootstrap .
   zip bff.zip bootstrap
   aws s3 cp bff.zip s3://lambda-artifacts-us-east-2-<ACCOUNT_ID>/lambda/bff.zip

   # Build Post-Confirmation Lambda
   cd ../lambda-cognito-postconfirm
   GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -tags lambda.norpc -ldflags="-s -w" -o bootstrap .
   zip cognito-postconfirm.zip bootstrap
   aws s3 cp cognito-postconfirm.zip s3://lambda-artifacts-us-east-2-<ACCOUNT_ID>/lambda/cognito-postconfirm.zip

   # Build Pre-Token Generation Lambda
   cd ../lambda-pre-token-generation
   GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -tags lambda.norpc -ldflags="-s -w" -o bootstrap .
   zip pre-token-generation.zip bootstrap
   aws s3 cp pre-token-generation.zip s3://lambda-artifacts-us-east-2-<ACCOUNT_ID>/lambda/pre-token-generation.zip
   ```

3. **Deploy Terraform infrastructure**
   ```bash
   cd infra
   terraform init
   terraform plan -var="google_client_id=YOUR_GOOGLE_CLIENT_ID"
   terraform apply -var="google_client_id=YOUR_GOOGLE_CLIENT_ID"

   # Capture outputs
   terraform output -json > outputs.json
   ```

### Phase 2: Frontend Integration (TODO)

#### Install AWS SDK Dependencies
```bash
npm install @aws-sdk/client-cognito-identity \
            @aws-sdk/client-dynamodb \
            @aws-sdk/lib-dynamodb \
            @aws-sdk/credential-providers \
            amazon-cognito-identity-js
```

#### Create Frontend Files

1. **`src/config/aws.ts`** - AWS/Cognito configuration
   ```typescript
   export const awsConfig = {
     region: 'us-east-2',
     identityPoolId: '<FROM_TERRAFORM_OUTPUT>',
     userPoolId: '<FROM_TERRAFORM_OUTPUT>',
     userPoolWebClientId: '77efo2uje76pge8egkihhj8jvm',
     cognitoDomain: '<FROM_TERRAFORM_OUTPUT>',
     bffEndpoint: '<FROM_TERRAFORM_OUTPUT>',
     oauth: {
       domain: '<USER_POOL_DOMAIN>',
       scope: ['openid', 'email', 'profile'],
       redirectSignIn: 'https://thegradual.com',
       redirectSignOut: 'https://thegradual.com',
       responseType: 'code'
     }
   };
   ```

2. **`src/contexts/AuthContext.tsx`** - Authentication state management
   - Initialize Cognito Identity Pool on mount
   - Get anonymous identity ID automatically
   - Handle login redirect → callback → token exchange
   - Handle token refresh (auto-refresh before expiration)
   - Provide: `{ user, identityId, isAuthenticated, signIn, signOut, getCredentials }`

3. **`src/services/syncService.ts`** - DynamoDB sync layer
   - Replace localStorage with DynamoDB calls
   - Use Identity Pool credentials (works for anonymous + authenticated)
   - Methods: `saveSession()`, `getSessions()`, `saveCustomExercise()`, etc.
   - Fallback to localStorage if offline

4. **`src/components/AuthButton.tsx`** - Sign in/user menu component
   - Anonymous: Shows "Sign In" button
   - Authenticated: Shows user email/avatar + dropdown menu
   - Dropdown: "Profile" (new), "Sign Out"

5. **`src/components/Profile.tsx`** - User profile page (replaces Health)
   - Display user info (email, name, plan)
   - Show sync status ("Cloud synced" vs "Anonymous - Local only")
   - Workout statistics
   - Sign out button

6. **Update `src/App.jsx`**
   - Wrap with `<AuthProvider>`
   - Add `<AuthButton />` to navigation
   - Replace "Health" route with "Profile" route
   - Handle OAuth callback (`?code=...`)

7. **Update service layer** (`src/services/exerciseService.js`, etc.)
   - Remove all `localStorage.getItem()` / `localStorage.setItem()` calls
   - Use `syncService` instead
   - Maintain same API for components (no component changes needed)

### Phase 3: Testing

1. **Test anonymous flow**
   - Open app without signing in
   - Log a workout session
   - Close browser, reopen → data should persist (from DynamoDB)

2. **Test Google OAuth sign-in**
   - Click "Sign In" → Redirect to Cognito Hosted UI
   - Sign in with Google
   - Redirect back → See user menu with email
   - Previous anonymous data should be preserved (same Identity ID)

3. **Test email/password sign-in**
   - Sign up with email/password
   - Confirm email
   - Sign in → Should work

4. **Test cross-device sync**
   - Sign in on Device A → Log workouts
   - Sign in on Device B with same account → See same workouts

5. **Test token refresh**
   - Stay logged in for 4+ hours
   - Make API call → Should auto-refresh seamlessly

## Key Configuration Values

You'll need these values from Terraform outputs for the frontend config:

```bash
# Get all values at once
terraform output -json | jq '{
  identityPoolId: .cognito_identity_pool_id.value,
  userPoolId: .cognito_user_pool_id.value,
  cognitoDomain: .cognito_user_pool_domain.value,
  bffUrl: .bff_lambda_url.value
}'
```

## Current Blockers

1. **Google OAuth credentials** - Need to create OAuth app in Google Cloud Console
2. **Lambda builds** - Need to build and upload Go binaries to S3
3. **Terraform deployment** - Blocked by #1 and #2

## Next Steps (Recommended Order)

1. Set up Google OAuth app (get client ID + secret)
2. Store Google client secret in Parameter Store
3. Build all 3 Lambda functions
4. Deploy Terraform infrastructure
5. Get Terraform outputs
6. Implement frontend Auth system
7. Test thoroughly

## Notes

- **No data migration needed** - All users (anonymous + authenticated) use DynamoDB from day 1
- **Identity upgrade is automatic** - Cognito handles anonymous → authenticated transition
- **Backwards compatible** - Can deploy infrastructure first, then gradually roll out frontend changes
- **Profile page** - Will replace "Health" page per user request

## Files Modified/Created

### Terraform (Backend)
- `infra/variables.tf` - Added Cognito variables
- `infra/cognito.tf` - NEW (User Pool, Identity Pool, IAM roles)
- `infra/lambda_bff.tf` - NEW (BFF Lambda)
- `infra/lambda_cognito_triggers.tf` - NEW (Post-confirmation, Pre-token)
- `infra/outputs.tf` - Added Cognito outputs

### Lambda Functions
- `lambda-bff/` - NEW (copied from Sharewaves, no changes needed)
- `lambda-cognito-postconfirm/` - NEW (updated to remove beta logic)
- `lambda-pre-token-generation/` - NEW (copied from Sharewaves)

### Frontend (TODO)
- `src/config/aws.ts` - To be created
- `src/contexts/AuthContext.tsx` - To be created
- `src/services/syncService.ts` - To be created
- `src/components/AuthButton.tsx` - To be created
- `src/components/Profile.tsx` - To be created (replaces Health)
- `src/App.jsx` - To be updated
- `src/services/*.js` - To be updated (use syncService)
- `package.json` - To be updated (add AWS SDK dependencies)
