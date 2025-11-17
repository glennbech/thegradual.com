# Variables
BINARY_NAME=bootstrap
ZIP_NAME=user-state.zip
AWS_REGION=us-east-2
LAMBDA_FUNCTION_NAME=thegradual-user-state

# S3 bucket for Lambda artifacts (will be auto-created by Terraform)
# Format: lambda-artifacts-{region}-{account-id}
S3_BUCKET=$(shell aws sts get-caller-identity --query Account --output text 2>/dev/null | xargs -I {} echo "lambda-artifacts-$(AWS_REGION)-{}")
S3_KEY=lambda/$(ZIP_NAME)

.PHONY: build package upload deploy update-lambda clean size test deps help

# Build for Lambda (Amazon Linux 2023)
build:
	@echo "Building Lambda function for Amazon Linux 2..."
	GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -tags lambda.norpc -ldflags="-s -w" -o $(BINARY_NAME) .
	@echo "✓ Build complete: $(BINARY_NAME)"

# Create deployment package
package: build
	@echo "Creating deployment package..."
	@rm -f $(ZIP_NAME)
	zip $(ZIP_NAME) $(BINARY_NAME)
	@echo "✓ Package created: $(ZIP_NAME)"

# Upload to S3
upload: package
	@echo "Uploading to S3..."
	@echo "Bucket: $(S3_BUCKET)"
	aws s3 cp $(ZIP_NAME) s3://$(S3_BUCKET)/$(S3_KEY) --region $(AWS_REGION)
	@echo "✓ Upload complete: s3://$(S3_BUCKET)/$(S3_KEY)"

# Deploy (build, package, and upload)
deploy: upload
	@echo "✓ Deployment complete!"

# Update Lambda function code directly (bypasses Terraform)
update-lambda: package
	@echo "Updating Lambda function code..."
	aws lambda update-function-code \
		--function-name $(LAMBDA_FUNCTION_NAME) \
		--zip-file fileb://$(ZIP_NAME) \
		--region $(AWS_REGION)
	@echo "✓ Lambda function updated!"

# Clean build artifacts
clean:
	@echo "Cleaning up..."
	@rm -f $(BINARY_NAME) $(ZIP_NAME)
	@echo "✓ Cleaned"

# Show package size
size: package
	@ls -lh $(ZIP_NAME)

# Run tests
test:
	go test -v ./...

# Download dependencies
deps:
	go mod download
	go mod tidy

# Help
help:
	@echo "Available targets:"
	@echo "  make build         - Build the Lambda binary for Linux/AMD64"
	@echo "  make package       - Build and create deployment zip"
	@echo "  make upload        - Build, package, and upload to S3"
	@echo "  make deploy        - Alias for upload"
	@echo "  make update-lambda - Update Lambda function code directly"
	@echo "  make test          - Run tests"
	@echo "  make deps          - Download and tidy dependencies"
	@echo "  make clean         - Remove build artifacts"
	@echo "  make size          - Show deployment package size"
