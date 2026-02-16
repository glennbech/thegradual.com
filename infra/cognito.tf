# Cognito User Pool for TheGradual authentication
resource "aws_cognito_user_pool" "this" {
  name = "${local.name_prefix}-user-pool"

  username_attributes = ["email"]

  auto_verified_attributes = ["email"]

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  lambda_config {
    post_confirmation    = aws_lambda_function.post_confirmation.arn
    pre_token_generation = aws_lambda_function.pre_token_generation.arn
  }

  # Custom attribute for subscription plan (future premium features)
  schema {
    name                = "plan"
    attribute_data_type = "String"
    mutable             = true
    required            = false

    string_attribute_constraints {
      min_length = 0
      max_length = 256
    }
  }

  tags = merge(local.common_tags, {
    Purpose = "TheGradual Gym Tracker Auth"
  })
}

# Cognito User Pool Domain (Managed Login v2)
resource "aws_cognito_user_pool_domain" "this" {
  domain                = "${local.name_prefix}-auth"
  user_pool_id          = aws_cognito_user_pool.this.id
  managed_login_version = 1
}

# SSM Parameter for Google OAuth Client Secret (if using Google OAuth)
data "aws_ssm_parameter" "google_client_secret" {
  count = var.google_client_id != "" ? 1 : 0
  name  = "/thegradual/client_secret"
}

# Google Identity Provider (optional - only if Google client ID provided)
resource "aws_cognito_identity_provider" "google" {
  count         = var.google_client_id != "" ? 1 : 0
  user_pool_id  = aws_cognito_user_pool.this.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id                       = var.google_client_id
    client_secret                   = data.aws_ssm_parameter.google_client_secret[0].value
    authorize_scopes                = "openid email profile"
    attributes_url                  = "https://people.googleapis.com/v1/people/me?personFields="
    attributes_url_add_attributes   = "true"
    authorize_url                   = "https://accounts.google.com/o/oauth2/v2/auth"
    oidc_issuer                     = "https://accounts.google.com"
    token_request_method            = "POST"
    token_url                       = "https://www.googleapis.com/oauth2/v4/token"
  }

  attribute_mapping = {
    email    = "email"
    name     = "name"
    picture  = "picture"
    username = "sub"
  }
}

# Cognito User Pool Client for BFF Lambda (confidential client)
# Note: This client is used by both frontend and BFF for OAuth flow
resource "aws_cognito_user_pool_client" "server" {
  name         = "${local.name_prefix}-server-client"
  user_pool_id = aws_cognito_user_pool.this.id

  generate_secret = true # confidential client

  supported_identity_providers = concat(
    ["COGNITO"],
    var.google_client_id != "" ? ["Google"] : []
  )

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]

  callback_urls = var.cognito_callback_urls

  logout_urls = var.cognito_callback_urls

  prevent_user_existence_errors = "ENABLED"

  access_token_validity  = 1440 # 24 hours (1 day)
  id_token_validity      = 1440 # 24 hours (1 day)
  refresh_token_validity = 90   # 90 days
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}

# Store server client secret in SSM Parameter Store
resource "aws_ssm_parameter" "cognito_server_client_secret" {
  name        = "/${var.domain_name}/cognito/server_client_secret"
  description = "Cognito server client secret for BFF Lambda"
  type        = "SecureString"
  value       = aws_cognito_user_pool_client.server.client_secret

  tags = merge(local.common_tags, {
    Purpose = "Cognito Server Client Secret"
  })

  lifecycle {
    ignore_changes = [value]
  }
}

# Cognito Identity Pool for anonymous + authenticated access
resource "aws_cognito_identity_pool" "this" {
  identity_pool_name               = "${local.name_prefix}-identity-pool"
  allow_unauthenticated_identities = true # Enable anonymous users
  allow_classic_flow               = false

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.server.id
    provider_name           = aws_cognito_user_pool.this.endpoint
    server_side_token_check = false # Note: Using server client but check is disabled
  }

  tags = merge(local.common_tags, {
    Purpose = "TheGradual Identity Pool for anonymous + authenticated users"
  })
}

# IAM role for authenticated users (signed in with Cognito)
resource "aws_iam_role" "authenticated" {
  name = "${local.name_prefix}-cognito-authenticated-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.this.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "authenticated"
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

# IAM role for unauthenticated users (anonymous guests)
resource "aws_iam_role" "unauthenticated" {
  name = "${local.name_prefix}-cognito-unauthenticated-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "cognito-identity.amazonaws.com"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "cognito-identity.amazonaws.com:aud" = aws_cognito_identity_pool.this.id
          }
          "ForAnyValue:StringLike" = {
            "cognito-identity.amazonaws.com:amr" = "unauthenticated"
          }
        }
      }
    ]
  })

  tags = local.common_tags
}

# IAM policy for authenticated users (DynamoDB access)
resource "aws_iam_role_policy" "authenticated" {
  name = "${local.name_prefix}-cognito-authenticated-policy"
  role = aws_iam_role.authenticated.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.user_states.arn
        Condition = {
          "ForAllValues:StringEquals" = {
            "dynamodb:LeadingKeys" = ["$${cognito-identity.amazonaws.com:sub}"]
          }
        }
      }
    ]
  })
}

# IAM policy for unauthenticated users (DynamoDB access - same permissions)
resource "aws_iam_role_policy" "unauthenticated" {
  name = "${local.name_prefix}-cognito-unauthenticated-policy"
  role = aws_iam_role.unauthenticated.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.user_states.arn
        Condition = {
          "ForAllValues:StringEquals" = {
            "dynamodb:LeadingKeys" = ["$${cognito-identity.amazonaws.com:sub}"]
          }
        }
      }
    ]
  })
}

# Attach IAM roles to Identity Pool
resource "aws_cognito_identity_pool_roles_attachment" "this" {
  identity_pool_id = aws_cognito_identity_pool.this.id

  roles = {
    authenticated   = aws_iam_role.authenticated.arn
    unauthenticated = aws_iam_role.unauthenticated.arn
  }
}
