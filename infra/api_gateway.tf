# REST API Gateway
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-api"
  description = "TheGradual Gym App API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = local.common_tags
}

# /api resource
resource "aws_api_gateway_resource" "api" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "api"
}

# /api/{uuid} resource
resource "aws_api_gateway_resource" "uuid" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "{uuid}"
}

# /api/{uuid}/debug resource
resource "aws_api_gateway_resource" "debug" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.uuid.id
  path_part   = "debug"
}

# GET /api/{uuid} method
resource "aws_api_gateway_method" "get_state" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.uuid.id
  http_method   = "GET"
  authorization = "NONE"
}

# POST /api/{uuid} method
resource "aws_api_gateway_method" "save_state" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.uuid.id
  http_method   = "POST"
  authorization = "NONE"
}

# OPTIONS /api/{uuid} method (CORS preflight)
resource "aws_api_gateway_method" "options_state" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.uuid.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# GET /api/{uuid}/debug method
resource "aws_api_gateway_method" "get_debug" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.debug.id
  http_method   = "GET"
  authorization = "NONE"
}

# Lambda integration for GET
resource "aws_api_gateway_integration" "get_state" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.uuid.id
  http_method             = aws_api_gateway_method.get_state.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.user_state.invoke_arn
}

# Lambda integration for POST
resource "aws_api_gateway_integration" "save_state" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.uuid.id
  http_method             = aws_api_gateway_method.save_state.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.user_state.invoke_arn
}

# Mock integration for OPTIONS (CORS preflight)
resource "aws_api_gateway_integration" "options_state" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.uuid.id
  http_method = aws_api_gateway_method.options_state.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# Lambda integration for GET /debug
resource "aws_api_gateway_integration" "get_debug" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.debug.id
  http_method             = aws_api_gateway_method.get_debug.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.user_state.invoke_arn
}

# OPTIONS method response
resource "aws_api_gateway_method_response" "options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.uuid.id
  http_method = aws_api_gateway_method.options_state.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

# OPTIONS integration response
resource "aws_api_gateway_integration_response" "options_200" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.uuid.id
  http_method = aws_api_gateway_method.options_state.http_method
  status_code = aws_api_gateway_method_response.options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [aws_api_gateway_integration.options_state]
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.user_state.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*/*"
}

# API Deployment
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.api.id,
      aws_api_gateway_resource.uuid.id,
      aws_api_gateway_resource.debug.id,
      aws_api_gateway_method.get_state.id,
      aws_api_gateway_method.save_state.id,
      aws_api_gateway_method.options_state.id,
      aws_api_gateway_method.get_debug.id,
      aws_api_gateway_integration.get_state.id,
      aws_api_gateway_integration.save_state.id,
      aws_api_gateway_integration.options_state.id,
      aws_api_gateway_integration.get_debug.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.get_state,
    aws_api_gateway_integration.save_state,
    aws_api_gateway_integration.options_state,
    aws_api_gateway_integration.get_debug
  ]
}

# API Stage
resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = "prod"

  tags = local.common_tags
}

# Usage Plan (for rate limiting)
resource "aws_api_gateway_usage_plan" "main" {
  name        = "${var.project_name}-usage-plan"
  description = "Rate limiting for TheGradual API"

  api_stages {
    api_id = aws_api_gateway_rest_api.main.id
    stage  = aws_api_gateway_stage.prod.stage_name
  }

  throttle_settings {
    rate_limit  = var.api_rate_limit  # 5 requests per second
    burst_limit = var.api_burst_limit # 10 burst
  }

  tags = local.common_tags
}

# ACM Certificate for API Gateway (regional)
resource "aws_acm_certificate" "api" {
  domain_name       = var.api_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(
    local.common_tags,
    {
      Name = var.api_domain_name
    }
  )
}

# DNS validation record for API certificate
resource "aws_route53_record" "api_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert_validation : record.fqdn]
}

# Custom Domain for API Gateway
resource "aws_api_gateway_domain_name" "api" {
  domain_name              = var.api_domain_name
  regional_certificate_arn = aws_acm_certificate_validation.api.certificate_arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = local.common_tags
}

# Base Path Mapping
resource "aws_api_gateway_base_path_mapping" "api" {
  api_id      = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  domain_name = aws_api_gateway_domain_name.api.domain_name
}
