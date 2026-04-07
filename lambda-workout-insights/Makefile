# Variables
ZIP_NAME=workout-insights.zip
AWS_REGION=us-east-2
LAMBDA_FUNCTION_NAME=thegradual-workout-insights
PYTHON_VERSION=python3.12

# S3 bucket for Lambda artifacts (will be auto-created by Terraform)
# Format: lambda-artifacts-{region}-{account-id}
S3_BUCKET=$(shell aws sts get-caller-identity --query Account --output text 2>/dev/null | xargs -I {} echo "lambda-artifacts-$(AWS_REGION)-{}")
S3_KEY=lambda/$(ZIP_NAME)

.PHONY: build package upload deploy update-lambda clean size test deps help

# Install dependencies
deps:
	@echo "Installing Python dependencies..."
	pip install -r requirements.txt -t ./package
	@echo "✓ Dependencies installed"

# Create deployment package
build: clean
	@echo "Building Lambda deployment package..."
	@mkdir -p package
	@echo "Installing dependencies to package/ (Linux-compatible)..."
	pip install -r requirements.txt -t ./package --platform manylinux2014_x86_64 --python-version 3.12 --only-binary=:all: --quiet
	@echo "Copying Lambda handler..."
	cp main.py ./package/
	@echo "Copying research document..."
	cp hypertrophy_research.md ./package/
	@echo "✓ Build complete"

# Package into zip
package: build
	@echo "Creating deployment package..."
	@rm -f $(ZIP_NAME)
	cd package && zip -r ../$(ZIP_NAME) . -q
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
	@rm -rf package
	@rm -f $(ZIP_NAME)
	@echo "✓ Cleaned"

# Show package size
size: package
	@echo "Package size:"
	@ls -lh $(ZIP_NAME)

# Run tests (if you add tests later)
test:
	@echo "Running tests..."
	$(PYTHON_VERSION) -m pytest tests/ -v

# Local development - test Lambda locally
test-local:
	@echo "Testing Lambda locally..."
	@echo "Set environment variables and run:"
	@echo "export USER_STATE_TABLE_NAME=thegradual-user-state"
	@echo "export COGNITO_USER_POOL_ID=us-east-2_xxx"
	@echo "export COGNITO_REGION=us-east-2"
	@echo "$(PYTHON_VERSION) -c 'from main import lambda_handler; lambda_handler({}, {})'"

# Help
help:
	@echo "Available targets:"
	@echo "  make build         - Build Lambda package with dependencies"
	@echo "  make package       - Create deployment zip"
	@echo "  make upload        - Build, package, and upload to S3"
	@echo "  make deploy        - Alias for upload"
	@echo "  make update-lambda - Update Lambda function code directly"
	@echo "  make test          - Run tests"
	@echo "  make deps          - Install dependencies locally"
	@echo "  make clean         - Remove build artifacts"
	@echo "  make size          - Show deployment package size"
	@echo "  make test-local    - Show instructions for local testing"
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
