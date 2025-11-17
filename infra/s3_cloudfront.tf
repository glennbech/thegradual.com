# S3 Bucket for webapp
resource "aws_s3_bucket" "webapp" {
  bucket = local.webapp_bucket_name

  tags = merge(
    local.common_tags,
    {
      Name    = local.webapp_bucket_name
      Purpose = "Static Website Hosting"
    }
  )
}

# Block public access (CloudFront will access via OAC)
resource "aws_s3_bucket_public_access_block" "webapp" {
  bucket = aws_s3_bucket.webapp.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 website configuration
resource "aws_s3_bucket_website_configuration" "webapp" {
  bucket = aws_s3_bucket.webapp.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html" # SPA fallback
  }
}

# CloudFront Origin Access Control (OAC) - modern approach
resource "aws_cloudfront_origin_access_control" "webapp" {
  name                              = "${var.project_name}-webapp-oac"
  description                       = "OAC for ${var.project_name} webapp bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# S3 bucket policy to allow CloudFront access
resource "aws_s3_bucket_policy" "webapp" {
  bucket = aws_s3_bucket.webapp.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.webapp.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.webapp.arn
          }
        }
      }
    ]
  })
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "webapp" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # North America & Europe only
  aliases             = [var.domain_name, "www.${var.domain_name}"]
  comment             = "TheGradual Gym App"

  origin {
    domain_name              = aws_s3_bucket.webapp.bucket_regional_domain_name
    origin_id                = "S3-${local.webapp_bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.webapp.id
  }

  # SPA error handling (404/403 -> index.html)
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${local.webapp_bucket_name}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0 # No caching (0 TTL as requested)
    max_ttl                = 0
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.webapp.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = local.common_tags

  depends_on = [aws_acm_certificate_validation.webapp]
}
