package main

import (
	"context"
	"log"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	cognito "github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	cognitoTypes "github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
)

type App struct {
	cog *cognito.Client
}

func NewApp(ctx context.Context) (*App, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, err
	}
	return &App{cog: cognito.NewFromConfig(cfg)}, nil
}

func (a *App) Handle(ctx context.Context, e events.CognitoEventUserPoolsPostConfirmation) (events.CognitoEventUserPoolsPostConfirmation, error) {
	userPoolID := e.UserPoolID
	username := e.UserName

	attrs := e.Request.UserAttributes
	currentPlan, hasPlan := attrs["custom:plan"]

	// Prepare attributes to update
	var attributesToUpdate []cognitoTypes.AttributeType

	// Set default plan if not present
	if !hasPlan || currentPlan == "" {
		// All new users get free plan by default
		plan := "free"
		log.Printf("Setting default plan for new user: %s (plan: %s)", username, plan)

		attributesToUpdate = append(attributesToUpdate, cognitoTypes.AttributeType{
			Name:  aws.String("custom:plan"),
			Value: aws.String(plan),
		})
		log.Printf("Will set custom:plan=%s for %s", plan, username)
	}

	// Update attributes if needed
	if len(attributesToUpdate) > 0 {
		// Keep a short timeout so Post Confirmation can't hang signups
		cctx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()

		_, err := a.cog.AdminUpdateUserAttributes(cctx, &cognito.AdminUpdateUserAttributesInput{
			UserPoolId:     aws.String(userPoolID),
			Username:       aws.String(username),
			UserAttributes: attributesToUpdate,
		})
		if err != nil {
			// Soft-fail: log but allow confirmation to succeed
			log.Printf("WARN: failed to set custom attributes for %s: %v", username, err)
			// If you want to HARD fail (block signup), return the error instead.
			// return e, err
		} else {
			log.Printf("Successfully set default attributes for %s", username)
		}
	} else {
		log.Printf("User %s already has all required custom attributes", username)
	}

	return e, nil
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	app, err := NewApp(ctx)
	if err != nil {
		log.Fatalf("init failed: %v", err)
	}

	lambda.Start(app.Handle)
}
