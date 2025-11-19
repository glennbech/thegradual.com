# Post-Confirmation Lambda Trigger
# Invoked after user confirms their email/account
# Sets default custom:plan attribute to "free"

resource "aws_lambda_function" "post_confirmation" {
  s3_bucket = local.lambda_artifacts_bucket
  s3_key    = "lambda/cognito-postconfirm.zip"

  function_name = "${local.name_prefix}-post-confirmation"
  role          = aws_iam_role.post_confirmation_lambda.arn
  handler       = "bootstrap"
  runtime       = "provided.al2023"
  timeout       = 10
  memory_size   = 128

  environment {
    variables = {
      LOG_LEVEL = "INFO"
    }
  }

  tags = merge(local.common_tags, {
    Purpose = "Cognito Post-Confirmation Trigger"
  })
}

# IAM Role for Post-Confirmation Lambda
resource "aws_iam_role" "post_confirmation_lambda" {
  name = "${local.name_prefix}-cognito-post-conf-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# IAM Policy for Post-Confirmation Lambda to access Cognito
resource "aws_iam_policy" "post_confirmation_lambda" {
  name_prefix = "cognito-post-confirmation-"
  description = "Policy for Post Confirmation Lambda to update Cognito user attributes"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminGetUser",
          "cognito-idp:ListUsers"
        ]
        Resource = aws_cognito_user_pool.this.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })

  tags = local.common_tags
}

# Attach policies to Post-Confirmation Lambda role
resource "aws_iam_role_policy_attachment" "post_confirmation_lambda" {
  role       = aws_iam_role.post_confirmation_lambda.name
  policy_arn = aws_iam_policy.post_confirmation_lambda.arn
}

resource "aws_iam_role_policy_attachment" "post_confirmation_lambda_basic" {
  role       = aws_iam_role.post_confirmation_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Grant Cognito permission to invoke Post-Confirmation Lambda
resource "aws_lambda_permission" "post_confirmation" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.post_confirmation.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.this.arn
}

# Pre-Token Generation Lambda Trigger
# Invoked before tokens are generated
# Can add custom claims to tokens based on user attributes

resource "aws_lambda_function" "pre_token_generation" {
  s3_bucket = local.lambda_artifacts_bucket
  s3_key    = "lambda/pre-token-generation.zip"

  function_name = "${local.name_prefix}-pre-token-generation"
  role          = aws_iam_role.pre_token_generation_lambda.arn
  handler       = "bootstrap"
  runtime       = "provided.al2023"
  timeout       = 5
  memory_size   = 128

  environment {
    variables = {
      LOG_LEVEL = "INFO"
    }
  }

  tags = merge(local.common_tags, {
    Purpose = "Cognito Pre-Token Generation Trigger"
  })
}

# IAM Role for Pre-Token Generation Lambda
resource "aws_iam_role" "pre_token_generation_lambda" {
  name = "${local.name_prefix}-pre-token-gen-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# IAM Policy for Pre-Token Generation Lambda (only needs logging, doesn't write to Cognito)
resource "aws_iam_policy" "pre_token_generation_lambda" {
  name_prefix = "cognito-pre-token-generation-"
  description = "Policy for Pre Token Generation Lambda to log events"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })

  tags = local.common_tags
}

# Attach policies to Pre-Token Generation Lambda role
resource "aws_iam_role_policy_attachment" "pre_token_generation_lambda" {
  role       = aws_iam_role.pre_token_generation_lambda.name
  policy_arn = aws_iam_policy.pre_token_generation_lambda.arn
}

resource "aws_iam_role_policy_attachment" "pre_token_generation_lambda_basic" {
  role       = aws_iam_role.pre_token_generation_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Grant Cognito permission to invoke Pre-Token Generation Lambda
resource "aws_lambda_permission" "pre_token_generation" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pre_token_generation.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.this.arn
}
