# Infrastructure identity
output "aws_account_id" {
  description = "AWS Account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "aws_region" {
  description = "AWS Region"
  value       = data.aws_region.current.name
}

# Lambda outputs
output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.user_state.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.user_state.arn
}

output "lambda_artifacts_bucket" {
  description = "S3 bucket for Lambda artifacts (managed by terraform-init.sh)"
  value       = local.lambda_artifacts_bucket
}

# DynamoDB outputs
output "dynamodb_table_name" {
  description = "DynamoDB table name for user states"
  value       = aws_dynamodb_table.user_states.name
}

output "dynamodb_table_arn" {
  description = "DynamoDB table ARN"
  value       = aws_dynamodb_table.user_states.arn
}

# API Gateway outputs
output "api_gateway_url" {
  description = "API Gateway invoke URL"
  value       = "${aws_api_gateway_stage.prod.invoke_url}/api/{uuid}"
}

output "api_custom_domain_url" {
  description = "API custom domain URL"
  value       = "https://${var.api_domain_name}/api/{uuid}"
}

output "api_gateway_id" {
  description = "API Gateway REST API ID"
  value       = aws_api_gateway_rest_api.main.id
}

# CloudFront outputs
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.webapp.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.webapp.domain_name
}

# S3 outputs
output "webapp_bucket_name" {
  description = "S3 bucket name for webapp"
  value       = aws_s3_bucket.webapp.bucket
}

output "webapp_bucket_regional_domain" {
  description = "S3 bucket regional domain name"
  value       = aws_s3_bucket.webapp.bucket_regional_domain_name
}

# Website URLs
output "webapp_url" {
  description = "Webapp URL"
  value       = "https://${var.domain_name}"
}

output "webapp_www_url" {
  description = "Webapp WWW URL"
  value       = "https://www.${var.domain_name}"
}

# Certificate outputs
output "webapp_certificate_arn" {
  description = "ACM certificate ARN for webapp (us-east-1)"
  value       = aws_acm_certificate.webapp.arn
}

output "api_certificate_arn" {
  description = "ACM certificate ARN for API (regional)"
  value       = aws_acm_certificate.api.arn
}

# Summary output
output "deployment_summary" {
  description = "Deployment summary"
  value = {
    webapp_url       = "https://${var.domain_name}"
    api_url          = "https://${var.api_domain_name}/api/{uuid}"
    lambda_function  = aws_lambda_function.user_state.function_name
    dynamodb_table   = aws_dynamodb_table.user_states.name
    s3_webapp_bucket = aws_s3_bucket.webapp.bucket
    s3_lambda_bucket = local.lambda_artifacts_bucket
  }
}
