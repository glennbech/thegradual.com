package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
)

var (
	dynamoClient *dynamodb.DynamoDB
	tableName    string
)

// UserState represents the complete gym app state for a user
// Note: DynamoDB may have binary OR string data (migration from old format)
type UserState struct {
	UUID             string `json:"uuid" dynamodbav:"uuid"`
	Version          int64  `json:"version" dynamodbav:"version"`
	LastModified     string `json:"lastModified" dynamodbav:"lastModified"`
	Sessions         string `json:"sessions,omitempty" dynamodbav:"sessions,omitempty"`
	CustomExercises  string `json:"customExercises,omitempty" dynamodbav:"customExercises,omitempty"`
	CustomTemplates  string `json:"customTemplates,omitempty" dynamodbav:"customTemplates,omitempty"`
	ActiveSession    string `json:"activeSession,omitempty" dynamodbav:"activeSession,omitempty"`
	LastUpdated      string `json:"lastUpdated,omitempty" dynamodbav:"lastUpdated,omitempty"`
}

// DynamoUserState handles both binary and string formats from DynamoDB
type DynamoUserState struct {
	UUID             string      `dynamodbav:"uuid"`
	Version          int64       `dynamodbav:"version"`
	LastModified     string      `dynamodbav:"lastModified"`
	Sessions         interface{} `dynamodbav:"sessions,omitempty"`
	CustomExercises  interface{} `dynamodbav:"customExercises,omitempty"`
	CustomTemplates  interface{} `dynamodbav:"customTemplates,omitempty"`
	ActiveSession    interface{} `dynamodbav:"activeSession,omitempty"`
	LastUpdated      string      `dynamodbav:"lastUpdated,omitempty"`
}

// init runs once on Lambda cold start
func init() {
	sess := session.Must(session.NewSession())
	dynamoClient = dynamodb.New(sess)

	tableName = os.Getenv("DYNAMODB_TABLE")
	if tableName == "" {
		log.Fatal("DYNAMODB_TABLE environment variable is required")
	}

	log.Printf("Lambda initialized with DynamoDB table: %s", tableName)
}

func main() {
	lambda.Start(handleRequest)
}

// convertToString handles both binary ([]byte) and string data from DynamoDB
func convertToString(val interface{}) string {
	if val == nil {
		return ""
	}

	switch v := val.(type) {
	case string:
		// Already a string, return as-is
		return v
	case []byte:
		// Binary data, convert to string
		return string(v)
	default:
		// Unknown type, return empty
		log.Printf("Warning: unexpected type %T for field, returning empty string", v)
		return ""
	}
}

// handleRequest is the main Lambda handler for API Gateway proxy events
func handleRequest(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// CORS headers for all responses
	corsHeaders := map[string]string{
		"Content-Type":                 "application/json",
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Requested-With",
		"Access-Control-Max-Age":       "86400",
	}

	// Handle CORS preflight
	if request.HTTPMethod == "OPTIONS" {
		return events.APIGatewayProxyResponse{
			StatusCode: 204,
			Headers:    corsHeaders,
		}, nil
	}

	// Extract UUID from path parameters
	uuid, ok := request.PathParameters["uuid"]
	if !ok || uuid == "" {
		return errorResponse(corsHeaders, 400, "Missing uuid in path")
	}

	log.Printf("Request: %s /api/%s", request.HTTPMethod, uuid)

	// Check if this is a debug endpoint request
	if request.Resource == "/api/{uuid}/debug" && request.HTTPMethod == "GET" {
		return handleDebugState(ctx, uuid, corsHeaders)
	}

	// Route based on HTTP method
	switch request.HTTPMethod {
	case "GET":
		return handleGetState(ctx, uuid, corsHeaders)
	case "POST":
		return handleSaveState(ctx, uuid, request.Body, corsHeaders)
	default:
		return errorResponse(corsHeaders, 405, "Method not allowed")
	}
}

// handleGetState retrieves user state from DynamoDB
func handleGetState(ctx context.Context, uuid string, headers map[string]string) (events.APIGatewayProxyResponse, error) {
	input := &dynamodb.GetItemInput{
		TableName: aws.String(tableName),
		Key: map[string]*dynamodb.AttributeValue{
			"uuid": {S: aws.String(uuid)},
		},
	}

	result, err := dynamoClient.GetItemWithContext(ctx, input)
	if err != nil {
		log.Printf("DynamoDB GetItem error: %v", err)
		return errorResponse(headers, 500, "Failed to retrieve state")
	}

	// If no item found, return empty state with full structure
	if result.Item == nil {
		emptyState := UserState{
			UUID:            uuid,
			Version:         1,
			LastModified:    "",
			Sessions:        "[]",
			CustomExercises: "[]",
			CustomTemplates: "[]",
			ActiveSession:   "null",
			LastUpdated:     "",
		}
		body, _ := json.Marshal(emptyState)
		return events.APIGatewayProxyResponse{
			StatusCode: 200,
			Headers:    headers,
			Body:       string(body),
		}, nil
	}

	// Unmarshal DynamoDB item - use flexible type to handle both binary and string
	var dynamoState DynamoUserState
	err = dynamodbattribute.UnmarshalMap(result.Item, &dynamoState)
	if err != nil {
		log.Printf("DynamoDB unmarshal error: %v", err)
		return errorResponse(headers, 500, "Failed to parse state")
	}

	// Convert to UserState with string fields (handles both binary and string)
	state := UserState{
		UUID:            dynamoState.UUID,
		Version:         dynamoState.Version,
		LastModified:    dynamoState.LastModified,
		Sessions:        convertToString(dynamoState.Sessions),
		CustomExercises: convertToString(dynamoState.CustomExercises),
		CustomTemplates: convertToString(dynamoState.CustomTemplates),
		ActiveSession:   convertToString(dynamoState.ActiveSession),
		LastUpdated:     dynamoState.LastUpdated,
	}

	// Migrate old records: if version is 0, set to 1
	if state.Version == 0 {
		state.Version = 1
	}

	body, err := json.Marshal(state)
	if err != nil {
		log.Printf("JSON marshal error: %v", err)
		return errorResponse(headers, 500, "Failed to serialize state")
	}

	log.Printf("Retrieved state for user %s (%d bytes)", uuid, len(body))

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers:    headers,
		Body:       string(body),
	}, nil
}

// handleSaveState saves user state to DynamoDB with optimistic locking
func handleSaveState(ctx context.Context, uuid string, body string, headers map[string]string) (events.APIGatewayProxyResponse, error) {
	// Parse incoming JSON
	var incomingState UserState
	if err := json.Unmarshal([]byte(body), &incomingState); err != nil {
		log.Printf("JSON unmarshal error: %v", err)
		return errorResponse(headers, 400, "Invalid JSON body")
	}

	// Ensure UUID matches path parameter
	incomingState.UUID = uuid

	// Get current state to check version
	currentItem, err := dynamoClient.GetItemWithContext(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(tableName),
		Key: map[string]*dynamodb.AttributeValue{
			"uuid": {S: aws.String(uuid)},
		},
	})
	if err != nil {
		log.Printf("DynamoDB GetItem error during save: %v", err)
		return errorResponse(headers, 500, "Failed to check current version")
	}

	expectedVersion := incomingState.Version
	newVersion := expectedVersion + 1

	// If this is a new user (no existing item), accept version 1
	if currentItem.Item == nil {
		if expectedVersion != 1 {
			log.Printf("Conflict: New user must have version 1, got %d", expectedVersion)
			return conflictResponse(headers, 0, "New user must start at version 1")
		}
		newVersion = 2 // First save creates version 2
	} else {
		// Existing user: verify version matches
		var currentState DynamoUserState
		if err := dynamodbattribute.UnmarshalMap(currentItem.Item, &currentState); err != nil {
			log.Printf("DynamoDB unmarshal error during version check: %v", err)
			return errorResponse(headers, 500, "Failed to parse current state")
		}

		currentVersion := currentState.Version
		// Migrate old records without version
		if currentVersion == 0 {
			currentVersion = 1
		}

		// Version mismatch = conflict
		if expectedVersion != currentVersion {
			log.Printf("Conflict: Expected version %d, current version is %d", expectedVersion, currentVersion)
			return conflictResponse(headers, currentVersion, "Data was modified elsewhere")
		}

		newVersion = currentVersion + 1
	}

	// Update state with new version and timestamp
	incomingState.Version = newVersion
	incomingState.LastModified = getCurrentTimestamp()

	// Marshal to DynamoDB format
	item, err := dynamodbattribute.MarshalMap(incomingState)
	if err != nil {
		log.Printf("DynamoDB marshal error: %v", err)
		return errorResponse(headers, 500, "Failed to prepare state")
	}

	// Conditional write: only succeed if version still matches
	input := &dynamodb.PutItemInput{
		TableName: aws.String(tableName),
		Item:      item,
	}

	// Only add condition if not a new record
	if currentItem.Item != nil {
		input.ConditionExpression = aws.String("version = :expectedVersion OR attribute_not_exists(version)")
		input.ExpressionAttributeValues = map[string]*dynamodb.AttributeValue{
			":expectedVersion": {N: aws.String(fmt.Sprintf("%d", expectedVersion))},
		}
	}

	_, err = dynamoClient.PutItemWithContext(ctx, input)
	if err != nil {
		// Check if it's a conditional check failure
		if awsErr, ok := err.(*dynamodb.ConditionalCheckFailedException); ok {
			log.Printf("Conditional check failed: %v", awsErr)
			return conflictResponse(headers, 0, "Version conflict - data was modified elsewhere")
		}
		log.Printf("DynamoDB PutItem error: %v", err)
		return errorResponse(headers, 500, "Failed to save state")
	}

	log.Printf("Saved state for user %s (version %d -> %d, %d bytes)", uuid, expectedVersion, newVersion, len(body))

	// Return success response with new version
	response := map[string]interface{}{
		"uuid":         uuid,
		"status":       "saved",
		"message":      "State saved successfully",
		"version":      newVersion,
		"lastModified": incomingState.LastModified,
	}

	responseBody, _ := json.Marshal(response)

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers:    headers,
		Body:       string(responseBody),
	}, nil
}

// handleDebugState retrieves user state and returns it as beautifully formatted HTML
func handleDebugState(ctx context.Context, uuid string, headers map[string]string) (events.APIGatewayProxyResponse, error) {
	input := &dynamodb.GetItemInput{
		TableName: aws.String(tableName),
		Key: map[string]*dynamodb.AttributeValue{
			"uuid": {S: aws.String(uuid)},
		},
	}

	result, err := dynamoClient.GetItemWithContext(ctx, input)
	if err != nil {
		log.Printf("DynamoDB GetItem error: %v", err)
		return errorResponse(headers, 500, "Failed to retrieve state")
	}

	// If no item found, return empty state
	if result.Item == nil {
		emptyState := UserState{
			UUID:            uuid,
			Sessions:        "[]",
			CustomExercises: "[]",
			CustomTemplates: "[]",
			ActiveSession:   "null",
			LastUpdated:     "",
		}
		return formatDebugHTML(emptyState, uuid)
	}

	// Unmarshal DynamoDB item - use flexible type to handle both binary and string
	var dynamoState DynamoUserState
	err = dynamodbattribute.UnmarshalMap(result.Item, &dynamoState)
	if err != nil {
		log.Printf("DynamoDB unmarshal error: %v", err)
		return errorResponse(headers, 500, "Failed to parse state")
	}

	// Convert to UserState with string fields
	state := UserState{
		UUID:            dynamoState.UUID,
		Sessions:        convertToString(dynamoState.Sessions),
		CustomExercises: convertToString(dynamoState.CustomExercises),
		CustomTemplates: convertToString(dynamoState.CustomTemplates),
		ActiveSession:   convertToString(dynamoState.ActiveSession),
		LastUpdated:     dynamoState.LastUpdated,
	}

	return formatDebugHTML(state, uuid)
}

// formatDebugHTML creates a beautiful HTML page with formatted JSON
func formatDebugHTML(state UserState, uuid string) (events.APIGatewayProxyResponse, error) {
	// Pretty-print JSON with 2-space indentation
	prettyJSON, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return errorResponse(map[string]string{"Content-Type": "application/json"}, 500, "Failed to format JSON")
	}

	html := `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Debug: User State - ` + uuid + `</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
            color: #2d3748;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        .header h1 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
            font-weight: 700;
        }
        .header p {
            font-size: 1rem;
            opacity: 0.9;
        }
        .header .uuid {
            background: rgba(255,255,255,0.2);
            padding: 0.5rem 1rem;
            border-radius: 8px;
            display: inline-block;
            margin-top: 1rem;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
        }
        .content {
            padding: 2rem;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: linear-gradient(135deg, #f6f8fb 0%, #e9ecef 100%);
            padding: 1.5rem;
            border-radius: 12px;
            border-left: 4px solid #667eea;
        }
        .stat-card h3 {
            font-size: 0.875rem;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }
        .stat-card p {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1e293b;
        }
        .json-container {
            background: #1e293b;
            border-radius: 12px;
            padding: 1.5rem;
            overflow-x: auto;
        }
        pre {
            margin: 0;
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.875rem;
            line-height: 1.6;
            color: #e2e8f0;
        }
        .json-key {
            color: #60a5fa;
        }
        .json-string {
            color: #34d399;
        }
        .json-number {
            color: #fbbf24;
        }
        .json-boolean {
            color: #f472b6;
        }
        .json-null {
            color: #94a3b8;
        }
        .actions {
            margin-top: 2rem;
            display: flex;
            gap: 1rem;
            justify-content: center;
        }
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: transform 0.2s, box-shadow 0.2s;
            border: none;
            cursor: pointer;
            font-size: 1rem;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
        }
        .btn:active {
            transform: translateY(0);
        }
        .footer {
            text-align: center;
            padding: 2rem;
            color: #64748b;
            font-size: 0.875rem;
            border-top: 1px solid #e2e8f0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏋️ TheGradual Debug Console</h1>
            <p>User State Viewer</p>
            <div class="uuid">UUID: ` + uuid + `</div>
        </div>
        <div class="content">
            <div class="stats">
                <div class="stat-card">
                    <h3>Sessions</h3>
                    <p id="sessions-count">-</p>
                </div>
                <div class="stat-card">
                    <h3>Custom Exercises</h3>
                    <p id="exercises-count">-</p>
                </div>
                <div class="stat-card">
                    <h3>Custom Templates</h3>
                    <p id="templates-count">-</p>
                </div>
                <div class="stat-card">
                    <h3>Last Updated</h3>
                    <p id="last-updated">-</p>
                </div>
            </div>
            <div class="json-container">
                <pre id="json-output">` + string(prettyJSON) + `</pre>
            </div>
            <div class="actions">
                <button class="btn" onclick="copyToClipboard()">📋 Copy JSON</button>
                <button class="btn" onclick="downloadJSON()">💾 Download JSON</button>
            </div>
        </div>
        <div class="footer">
            TheGradual API Debug Endpoint • Generated ` + state.LastUpdated + `
        </div>
    </div>
    <script>
        const stateData = ` + string(prettyJSON) + `;

        // Calculate stats
        try {
            document.getElementById('sessions-count').textContent =
                Array.isArray(stateData.sessions) ? stateData.sessions.length : 0;
            document.getElementById('exercises-count').textContent =
                Array.isArray(stateData.customExercises) ? stateData.customExercises.length : 0;
            document.getElementById('templates-count').textContent =
                Array.isArray(stateData.customTemplates) ? stateData.customTemplates.length : 0;
            document.getElementById('last-updated').textContent =
                stateData.lastUpdated || 'Never';
        } catch (e) {
            console.error('Error calculating stats:', e);
        }

        function copyToClipboard() {
            const jsonText = document.getElementById('json-output').textContent;
            navigator.clipboard.writeText(jsonText).then(() => {
                alert('✅ JSON copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy:', err);
                alert('❌ Failed to copy to clipboard');
            });
        }

        function downloadJSON() {
            const jsonText = document.getElementById('json-output').textContent;
            const blob = new Blob([jsonText], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'user-state-` + uuid + `.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    </script>
</body>
</html>`

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers: map[string]string{
			"Content-Type":                "text/html; charset=utf-8",
			"Access-Control-Allow-Origin": "*",
		},
		Body: html,
	}, nil
}

// errorResponse creates a standardized error response
func errorResponse(headers map[string]string, statusCode int, message string) (events.APIGatewayProxyResponse, error) {
	errBody := map[string]string{
		"error":   "true",
		"message": message,
	}
	body, _ := json.Marshal(errBody)

	return events.APIGatewayProxyResponse{
		StatusCode: statusCode,
		Headers:    headers,
		Body:       string(body),
	}, nil
}

// conflictResponse creates a 409 Conflict response for version mismatches
func conflictResponse(headers map[string]string, currentVersion int64, message string) (events.APIGatewayProxyResponse, error) {
	errBody := map[string]interface{}{
		"error":          "conflict",
		"message":        message,
		"currentVersion": currentVersion,
	}
	body, _ := json.Marshal(errBody)

	return events.APIGatewayProxyResponse{
		StatusCode: 409,
		Headers:    headers,
		Body:       string(body),
	}, nil
}

// getCurrentTimestamp returns ISO 8601 formatted timestamp
func getCurrentTimestamp() string {
	return time.Now().UTC().Format(time.RFC3339)
}
