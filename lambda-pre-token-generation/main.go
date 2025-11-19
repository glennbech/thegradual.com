package main

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func handler(ctx context.Context, event events.CognitoEventUserPoolsPreTokenGen) (events.CognitoEventUserPoolsPreTokenGen, error) {
	log.Printf("Pre-token generation for user: %s", event.UserName)

	// Get custom attributes from user attributes
	userAttrs := event.Request.UserAttributes
	plan := userAttrs["custom:plan"]

	// Initialize claims map if needed
	if event.Response.ClaimsOverrideDetails.ClaimsToAddOrOverride == nil {
		event.Response.ClaimsOverrideDetails.ClaimsToAddOrOverride = make(map[string]string)
	}

	// Add custom attributes to ID token claims (without "custom:" prefix)
	if plan != "" {
		event.Response.ClaimsOverrideDetails.ClaimsToAddOrOverride["plan"] = plan
		log.Printf("Added plan to token: %s", plan)
	} else {
		// Default to "free" if no plan is set
		event.Response.ClaimsOverrideDetails.ClaimsToAddOrOverride["plan"] = "free"
		log.Printf("No plan found, defaulting to free")
	}

	return event, nil
}

func main() {
	lambda.Start(handler)
}
