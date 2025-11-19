# Auth Lambda Function

This AWS Lambda function handles authentication with AWS Cognito for the QuizCrunch application. It provides secure token management using httpOnly cookies for refresh tokens and returns access tokens to the frontend.

## Architecture

- **Refresh Token**: Stored in httpOnly, secure, SameSite cookie (XSS-resistant)
- **Access Token**: Returned to frontend, stored in memory only
- **ID Token**: Used to extract user information

## Endpoints

### POST /auth/login
Exchanges authorization code for tokens.

**Request:**
```json
{
  "code": "authorization_code_from_cognito"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "expires_in": 3600,
  "user": {
    "email": "user@example.com",
    "name": "John Doe",
    "given_name": "John",
    "family_name": "Doe",
    "sub": "user-id"
  }
}
```

**Cookie Set:** `refresh_token` (httpOnly, 30 days)

### POST /auth/refresh
Refreshes access token using refresh token from cookie.

**Response:**
```json
{
  "access_token": "eyJ...",
  "expires_in": 3600,
  "user": {
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### POST /auth/logout
Clears refresh token cookie and optionally revokes token with Cognito.

**Response:**
```json
{
  "success": true
}
```

### GET /auth/verify
Verifies an access token (optional endpoint for API gateway).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

## Environment Variables

Required:
- `COGNITO_DOMAIN`: Your Cognito domain (e.g., `quizcrunch-prod.auth.us-east-2.amazoncognito.com`)
- `COGNITO_CLIENT_ID`: Your Cognito app client ID
- `COGNITO_CLIENT_SECRET`: Your Cognito app client secret
- `REDIRECT_URI`: The redirect URI registered in Cognito (your frontend URL)

Optional:
- `FRONTEND_URL`: Frontend URL for CORS (e.g., `https://quizcrunch.com`)
- `COOKIE_DOMAIN`: Domain for cookies (e.g., `.quizcrunch.com`)
- `COOKIE_SECURE`: Set to `false` for local development (defaults to `true`)

## Deployment

### Prerequisites
1. AWS CLI configured
2. Go 1.20 or later
3. Lambda function created with Function URL enabled

### Build and Deploy

```bash
# Download dependencies
make deps

# Build and package
make package

# Deploy to Lambda (update function code directly)
make update-lambda LAMBDA_FUNCTION_NAME=your-function-name

# Or upload to S3 first
make upload S3_BUCKET=your-bucket AWS_REGION=us-east-2
```

### Lambda Configuration

1. **Runtime:** Provide your own bootstrap on Amazon Linux 2
2. **Handler:** bootstrap (not needed for custom runtime)
3. **Memory:** 128 MB (sufficient for auth operations)
4. **Timeout:** 10 seconds
5. **Environment Variables:** Set all required variables
6. **Function URL:** Enable with CORS configuration

### CORS Configuration for Lambda Function URL
```json
{
  "AllowOrigins": ["https://your-frontend-domain.com"],
  "AllowMethods": ["POST", "GET", "OPTIONS"],
  "AllowHeaders": ["content-type", "authorization"],
  "AllowCredentials": true
}
```

## Local Development

For local testing without Lambda:

```bash
# Set environment variables
export COGNITO_DOMAIN="your-domain.auth.region.amazoncognito.com"
export COGNITO_CLIENT_ID="your-client-id"
export COGNITO_CLIENT_SECRET="your-client-secret"
export REDIRECT_URI="http://localhost:3000"
export COOKIE_SECURE="false"

# Run locally (requires modification to server.go to run as regular HTTP server)
go run .
```

## Security Considerations

1. **Refresh Token Security**: Stored in httpOnly cookie, not accessible via JavaScript
2. **HTTPS Only**: Always use HTTPS in production (Secure flag on cookies)
3. **SameSite Cookie**: Protects against CSRF attacks
4. **Token Rotation**: Cognito can be configured to rotate refresh tokens
5. **Short-lived Access Tokens**: Default 1 hour expiry minimizes exposure

## Frontend Integration

Update your React AuthContext to use these endpoints:

```typescript
// Login
const response = await fetch('https://your-lambda-url/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code }),
  credentials: 'include' // Important for cookies
});

// Refresh
const response = await fetch('https://your-lambda-url/auth/refresh', {
  method: 'POST',
  credentials: 'include' // Sends cookie automatically
});

// Logout
const response = await fetch('https://your-lambda-url/auth/logout', {
  method: 'POST',
  credentials: 'include'
});
```

## Troubleshooting

1. **CORS Issues**: Ensure Lambda Function URL CORS is configured correctly
2. **Cookie Not Setting**: Check domain and secure flags match your environment
3. **Token Exchange Fails**: Verify client secret and redirect URI match Cognito configuration
4. **Refresh Fails**: Check cookie domain settings and SameSite configuration

## License

Part of the QuizCrunch application.