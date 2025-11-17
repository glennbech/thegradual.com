# S3 bucket for Lambda artifacts is managed by terraform-init.sh (imperative code)
# Reference: local.lambda_artifacts_bucket

# IAM Role for Lambda
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_user_state" {
  name               = "${local.lambda_user_state_name}-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = local.common_tags
}

# Attach basic Lambda execution role (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_user_state.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Custom IAM policy for DynamoDB access
data "aws_iam_policy_document" "lambda_dynamodb_access" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:Query"
    ]
    resources = [
      aws_dynamodb_table.user_states.arn
    ]
  }
}

resource "aws_iam_policy" "lambda_dynamodb_access" {
  name        = "${local.lambda_user_state_name}-dynamodb-access"
  description = "Allow Lambda to read/write user states in DynamoDB"
  policy      = data.aws_iam_policy_document.lambda_dynamodb_access.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_dynamodb_access" {
  role       = aws_iam_role.lambda_user_state.name
  policy_arn = aws_iam_policy.lambda_dynamodb_access.arn
}

# Lambda function
resource "aws_lambda_function" "user_state" {
  function_name = local.lambda_user_state_name
  role          = aws_iam_role.lambda_user_state.arn

  runtime       = "provided.al2023" # Custom runtime for Go
  handler       = "bootstrap"
  architectures = ["x86_64"]

  # Code from S3 (bucket managed by terraform-init.sh)
  s3_bucket = local.lambda_artifacts_bucket
  s3_key    = "lambda/user-state.zip"

  memory_size = 512  # Doubled from 256 for better performance
  timeout     = 10
  publish     = true # Required for provisioned concurrency

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.user_states.name
      LOG_LEVEL      = "info"
    }
  }

  tags = merge(
    local.common_tags,
    {
      Name = local.lambda_user_state_name
    }
  )
}

# Provisioned Concurrency (eliminates cold starts)
resource "aws_lambda_provisioned_concurrency_config" "user_state" {
  function_name                     = aws_lambda_function.user_state.function_name
  provisioned_concurrent_executions = 1
  qualifier                         = aws_lambda_function.user_state.version

  depends_on = [aws_lambda_function.user_state]
}

# CloudWatch Log Group (explicit creation for better control)
resource "aws_cloudwatch_log_group" "lambda_user_state" {
  name              = "/aws/lambda/${local.lambda_user_state_name}"
  retention_in_days = 7

  tags = local.common_tags
}
