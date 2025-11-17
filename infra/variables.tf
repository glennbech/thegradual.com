variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-2"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "thegradual"
}

variable "domain_name" {
  description = "Root domain name"
  type        = string
  default     = "thegradual.com"
}

variable "api_domain_name" {
  description = "API subdomain name"
  type        = string
  default     = "api.thegradual.com"
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone ID"
  type        = string
  default     = "Z0912940ZH45NX8LAOWE"
}

variable "api_rate_limit" {
  description = "API Gateway rate limit (requests per second)"
  type        = number
  default     = 5
}

variable "api_burst_limit" {
  description = "API Gateway burst limit"
  type        = number
  default     = 10
}
