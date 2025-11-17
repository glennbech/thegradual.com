# TheGradual.com Master Makefile
# Orchestrates building and deploying Lambda functions and webapp

.PHONY: help deploy-lambda build-lambda update-lambda clean-lambda webapp-sync webapp-build terraform-init terraform-plan terraform-apply deploy-all clean

# AWS Configuration
AWS_REGION=us-east-2
S3_WEBAPP_BUCKET=thegradual-webapp

# Lambda targets
deploy-lambda:
	@echo "========================================"
	@echo "Building and deploying Lambda function..."
	@echo "========================================"
	$(MAKE) -C lambda-user-state deploy
	@echo "✓ Lambda function deployed!"

build-lambda:
	@echo "Building Lambda function..."
	$(MAKE) -C lambda-user-state build

update-lambda:
	@echo "Updating Lambda function code directly..."
	$(MAKE) -C lambda-user-state update-lambda

clean-lambda:
	@echo "Cleaning Lambda artifacts..."
	$(MAKE) -C lambda-user-state clean

# Webapp targets
webapp-build:
	@echo "Building webapp..."
	npm run build
	@echo "✓ Webapp built successfully!"

webapp-sync: webapp-build
	@echo "Syncing webapp to S3..."
	aws s3 sync dist/ s3://$(S3_WEBAPP_BUCKET) --delete --region $(AWS_REGION)
	@echo "✓ Webapp deployed to S3!"

# Terraform targets
INFRA_DIR=infra

terraform-init:
	@echo "Initializing Terraform..."
	cd $(INFRA_DIR) && terraform init

terraform-plan:
	@echo "Planning Terraform changes..."
	cd $(INFRA_DIR) && terraform plan

terraform-apply:
	@echo "Applying Terraform changes..."
	cd $(INFRA_DIR) && terraform apply

terraform-destroy:
	@echo "Destroying Terraform resources..."
	cd $(INFRA_DIR) && terraform destroy

# Full deployment workflow
deploy-all: deploy-lambda terraform-apply webapp-sync
	@echo ""
	@echo "========================================"
	@echo "✓ Full deployment complete!"
	@echo "========================================"
	@echo "  - Lambda function built and uploaded"
	@echo "  - Terraform applied"
	@echo "  - Webapp deployed to S3"
	@echo ""
	@echo "Your app should be live at:"
	@echo "  https://thegradual.com"
	@echo ""
	@echo "API available at:"
	@echo "  https://api.thegradual.com/api/{uuid}"

# Clean all artifacts
clean: clean-lambda
	@echo "Cleaning webapp build artifacts..."
	@rm -rf dist/
	@echo "✓ All artifacts cleaned!"

# Help
help:
	@echo "TheGradual.com Makefile"
	@echo "======================="
	@echo ""
	@echo "Lambda targets:"
	@echo "  make deploy-lambda   - Build and deploy Lambda function to S3"
	@echo "  make build-lambda    - Build Lambda function only"
	@echo "  make update-lambda   - Update Lambda function code directly (bypass Terraform)"
	@echo "  make clean-lambda    - Clean Lambda build artifacts"
	@echo ""
	@echo "Webapp targets:"
	@echo "  make webapp-build    - Build webapp (npm run build)"
	@echo "  make webapp-sync     - Build and deploy webapp to S3"
	@echo ""
	@echo "Terraform targets:"
	@echo "  make terraform-init    - Initialize Terraform"
	@echo "  make terraform-plan    - Preview Terraform changes"
	@echo "  make terraform-apply   - Apply Terraform changes"
	@echo "  make terraform-destroy - Destroy all Terraform resources"
	@echo ""
	@echo "Full deployment:"
	@echo "  make deploy-all      - Deploy everything (Lambda + Terraform + Webapp)"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean           - Clean all build artifacts"
