# Current AWS account and region
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Reference existing Route53 hosted zone
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}
