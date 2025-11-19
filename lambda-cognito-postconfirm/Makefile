# Variables
BINARY_NAME=bootstrap
ZIP_NAME=cognito-postconfirm.zip
AWS_REGION=us-east-2
LAMBDA_FUNCTION_NAME=thegradual-post-confirmation

# S3 bucket for Lambda artifacts (will be auto-created by Terraform)
# Format: lambda-artifacts-{region}-{account-id}
S3_BUCKET=$(shell aws sts get-caller-identity --query Account --output text 2>/dev/null | xargs -I {} echo "lambda-artifacts-$(AWS_REGION)-{}")
S3_KEY=lambda/$(ZIP_NAME)

.PHONY: build clean deploy test package upload update-lambda logs help

# Build for Lambda runtime (optimized)
build:
	@echo "Building Lambda function for Amazon Linux 2..."
	GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -tags lambda.norpc -ldflags="-s -w" -o $(BINARY_NAME) .
	chmod +x $(BINARY_NAME)

# Create deployment package
package: build
	@echo "Creating deployment package..."
	@rm -f $(ZIP_NAME)
	zip $(ZIP_NAME) $(BINARY_NAME)
	@echo "Package created: $(ZIP_NAME)"

# Upload to S3
upload: package
	@echo "Uploading to S3..."
	aws s3 cp $(ZIP_NAME) s3://$(S3_BUCKET)/$(S3_KEY) --region $(AWS_REGION)
	@echo "Upload complete: s3://$(S3_BUCKET)/$(S3_KEY)"

# Deploy (build, package, and upload)
deploy: upload
	@echo "Deployment complete!"

# Update Lambda function code directly
update-lambda: package
	@echo "Updating Lambda function code..."
	aws lambda update-function-code \
		--function-name $(LAMBDA_FUNCTION_NAME) \
		--zip-file fileb://$(ZIP_NAME) \
		--region $(AWS_REGION)
	@echo "Lambda function updated!"

# Build for local testing
build-local:
	go build -o cognito-postconfirm .

# Run tests
test:
	@echo "Running tests..."
	go test -v ./...
	@echo "Tests complete"

# Clean build artifacts
clean:
	@echo "Cleaning up..."
	@rm -f $(BINARY_NAME) $(ZIP_NAME) cognito-postconfirm
	@echo "Clean complete"

# Download dependencies
deps:
	@echo "Downloading dependencies..."
	go mod download
	go mod tidy
	@echo "Dependencies downloaded"

# Tidy dependencies
tidy:
	go mod tidy

# Show package size
size: package
	@echo "Package size:"
	@ls -lh $(ZIP_NAME)

# Tail Lambda logs
logs:
	@echo "Tailing logs for $(LAMBDA_FUNCTION_NAME)..."
	aws logs tail /aws/lambda/$(LAMBDA_FUNCTION_NAME) --follow --region $(AWS_REGION)

# Help
help:
	@echo "Available targets:"
	@echo "  make build         - Build the Lambda binary for Linux/AMD64"
	@echo "  make package       - Build and create deployment zip"
	@echo "  make upload        - Build, package, and upload to S3"
	@echo "  make deploy        - Alias for upload"
	@echo "  make update-lambda - Update Lambda function code directly"
	@echo "  make test          - Run tests"
	@echo "  make clean         - Remove build artifacts"
	@echo "  make size          - Show deployment package size"
	@echo "  make deps          - Download and tidy dependencies"
	@echo "  make logs          - Tail Lambda CloudWatch logs"
	@echo "  make help          - Show this help message"
	@echo ""
	@echo "Configuration:"
	@echo "  LAMBDA_FUNCTION_NAME=$(LAMBDA_FUNCTION_NAME)"
	@echo "  S3_BUCKET=$(S3_BUCKET)"
	@echo "  S3_KEY=$(S3_KEY)"
	@echo "  AWS_REGION=$(AWS_REGION)"
	@echo ""
	@echo "Override variables:"
	@echo "  make update-lambda LAMBDA_FUNCTION_NAME=my-function"
	@echo "  make upload S3_BUCKET=my-bucket"
