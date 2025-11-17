# ACM Certificate for CloudFront (must be in us-east-1)
resource "aws_acm_certificate" "webapp" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(
    local.common_tags,
    {
      Name = var.domain_name
    }
  )
}

# Route53 DNS validation records for webapp certificate
resource "aws_route53_record" "webapp_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.webapp.domain_validation_options : dvo.domain_name => {
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

# Certificate validation for webapp
resource "aws_acm_certificate_validation" "webapp" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.webapp.arn
  validation_record_fqdns = [for record in aws_route53_record.webapp_cert_validation : record.fqdn]
}
