# BFF (Backend-for-Frontend) Lambda for Cognito authentication
# Handles OAuth flows with httpOnly cookies

locals {
  bff_lambda_name = "${local.name_prefix}-bff"
  bff_s3_key      = "lambda/bff.zip"
}

resource "aws_lambda_function" "bff" {
  function_name = local.bff_lambda_name
  role          = aws_iam_role.bff.arn

  runtime       = "provided.al2023"
  handler       = "bootstrap"
  architectures = ["x86_64"]

  s3_bucket = local.lambda_artifacts_bucket
  s3_key    = local.bff_s3_key

  timeout     = 5
  memory_size = 128

  environment {
    variables = {
      COGNITO_DOMAIN        = "${aws_cognito_user_pool_domain.this.domain}.auth.${data.aws_region.current.name}.amazoncognito.com"
      COGNITO_CLIENT_ID     = aws_cognito_user_pool_client.server.id
      COGNITO_CLIENT_SECRET = aws_cognito_user_pool_client.server.client_secret
      REDIRECT_URI          = "https://${var.domain_name}"
      ALLOWED_REDIRECT_URIS = join(",", var.cognito_callback_urls)
      FRONTEND_URL          = "https://${var.domain_name}"
      COOKIE_DOMAIN         = ".${var.domain_name}"
      COOKIE_SECURE         = "true"
    }
  }

  tags = merge(local.common_tags, {
    Purpose = "BFF Lambda for Cognito OAuth"
  })
}

# IAM Role for BFF Lambda
resource "aws_iam_role" "bff" {
  name = "${local.bff_lambda_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.common_tags
}

# Inline CloudWatch Logs Policy for BFF Lambda
resource "aws_iam_role_policy" "bff_logs" {
  name = "${local.bff_lambda_name}-logs"
  role = aws_iam_role.bff.id

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
}

# Lambda Function URL with CORS
resource "aws_lambda_function_url" "bff" {
  function_name      = aws_lambda_function.bff.function_name
  authorization_type = "NONE"

  cors {
    allow_credentials = true
    allow_origins     = concat(["https://${var.domain_name}", "https://www.${var.domain_name}"], ["http://localhost:5555"])
    allow_methods     = ["*"]
    allow_headers     = ["content-type", "authorization"]
    max_age           = 86400
  }
}
