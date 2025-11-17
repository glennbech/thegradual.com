# DynamoDB table for user states
resource "aws_dynamodb_table" "user_states" {
  name         = local.user_states_table_name
  billing_mode = "PAY_PER_REQUEST" # On-demand pricing

  hash_key = "uuid"

  attribute {
    name = "uuid"
    type = "S"
  }

  # Enable point-in-time recovery for data protection
  point_in_time_recovery {
    enabled = true
  }

  # Enable encryption at rest
  server_side_encryption {
    enabled = true
  }

  tags = merge(
    local.common_tags,
    {
      Name    = local.user_states_table_name
      Purpose = "User workout state storage"
    }
  )
}
