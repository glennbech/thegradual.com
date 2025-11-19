# TheGradual.com Master Makefile
# Orchestrates building and deploying Lambda functions and webapp

.PHONY: help deploy-lambda build-lambda update-lambda clean-lambda webapp-sync webapp-build terraform-init terraform-plan terraform-apply deploy-all clean

# AWS Configuration
AWS_REGION=us-east-2
S3_WEBAPP_BUCKET=thegradual-webapp

# Lambda directories
LAMBDA_DIRS=lambda-user-state lambda-bff lambda-cognito-postconfirm lambda-pre-token-generation

# Lambda targets
deploy-lambda:
	@echo "========================================"
	@echo "Building and deploying all Lambda functions..."
	@echo "========================================"
	@for dir in $(LAMBDA_DIRS); do \
		echo ""; \
		echo "Deploying $$dir..."; \
		$(MAKE) -C $$dir deploy || exit 1; \
	done
	@echo ""
	@echo "✓ All Lambda functions deployed!"

build-lambda:
	@echo "Building all Lambda functions..."
	@for dir in $(LAMBDA_DIRS); do \
		echo "Building $$dir..."; \
		$(MAKE) -C $$dir build || exit 1; \
	done
	@echo "✓ All Lambda functions built!"

update-lambda:
	@echo "Updating all Lambda function code directly..."
	@for dir in $(LAMBDA_DIRS); do \
		echo "Updating $$dir..."; \
		$(MAKE) -C $$dir update-lambda || exit 1; \
	done
	@echo "✓ All Lambda functions updated!"

clean-lambda:
	@echo "Cleaning all Lambda artifacts..."
	@for dir in $(LAMBDA_DIRS); do \
		$(MAKE) -C $$dir clean; \
	done
	@echo "✓ All Lambda artifacts cleaned!"

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
	@echo "  - Lambda functions built and uploaded:"
	@echo "    * lambda-user-state (API backend)"
	@echo "    * lambda-bff (Auth backend)"
	@echo "    * lambda-cognito-postconfirm (User setup)"
	@echo "    * lambda-pre-token-generation (JWT claims)"
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
	@echo "Lambda targets (builds all 4 functions):"
	@echo "  make deploy-lambda   - Build and deploy ALL Lambda functions to S3"
	@echo "  make build-lambda    - Build ALL Lambda functions only"
	@echo "  make update-lambda   - Update ALL Lambda function code directly (bypass Terraform)"
	@echo "  make clean-lambda    - Clean ALL Lambda build artifacts"
	@echo ""
	@echo "Lambda functions:"
	@echo "  - lambda-user-state            (User data API)"
	@echo "  - lambda-bff                   (Auth backend-for-frontend)"
	@echo "  - lambda-cognito-postconfirm   (Post-signup trigger)"
	@echo "  - lambda-pre-token-generation  (JWT claims trigger)"
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
	@echo "  make deploy-all      - Deploy everything (Lambdas + Terraform + Webapp)"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean           - Clean all build artifacts"
