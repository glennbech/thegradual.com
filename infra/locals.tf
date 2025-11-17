locals {
  # Lambda artifacts bucket name
  lambda_artifacts_bucket = "lambda-artifacts-${data.aws_region.current.name}-${data.aws_caller_identity.current.account_id}"

  # Common resource naming prefix
  name_prefix = var.project_name

  # Common tags
  common_tags = {
    Project   = var.project_name
    ManagedBy = "Terraform"
  }

  # Lambda function names
  lambda_user_state_name = "${local.name_prefix}-user-state"

  # DynamoDB table names
  user_states_table_name = "${local.name_prefix}-user-states"

  # S3 bucket names
  webapp_bucket_name = "${local.name_prefix}-webapp"
}
