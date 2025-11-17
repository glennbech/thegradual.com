#!/bin/bash

# Test commands for the User State Lambda API
# Replace API_ENDPOINT with your actual API Gateway URL after deployment

# Example: API_ENDPOINT="https://abc123.execute-api.us-east-2.amazonaws.com/prod"
API_ENDPOINT="YOUR_API_GATEWAY_URL_HERE"

# Test user UUID
USER_UUID="user-12345-test"

echo "======================================"
echo "User State Lambda API Test Commands"
echo "======================================"
echo ""
echo "Make sure to replace API_ENDPOINT with your actual URL!"
echo "Current endpoint: $API_ENDPOINT"
echo ""

# Test 1: POST - Save user state
echo "1. POST - Save User State"
echo "--------------------------------------"
echo "curl -X POST \\"
echo "  ${API_ENDPOINT}/api/${USER_UUID} \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d @test-data.json"
echo ""
echo "Run this command:"
echo ""
cat << 'EOF'
curl -X POST \
  ${API_ENDPOINT}/api/${USER_UUID} \
  -H 'Content-Type: application/json' \
  -d @test-data.json
EOF
echo ""
echo ""

# Test 2: GET - Retrieve user state
echo "2. GET - Retrieve User State"
echo "--------------------------------------"
echo "curl -X GET \\"
echo "  ${API_ENDPOINT}/api/${USER_UUID} \\"
echo "  -H 'Content-Type: application/json'"
echo ""
echo "Run this command:"
echo ""
cat << 'EOF'
curl -X GET \
  ${API_ENDPOINT}/api/${USER_UUID} \
  -H 'Content-Type: application/json'
EOF
echo ""
echo ""

# Test 3: GET - Retrieve non-existent user (should return empty state)
echo "3. GET - Non-existent User (Empty State)"
echo "--------------------------------------"
echo "curl -X GET \\"
echo "  ${API_ENDPOINT}/api/user-nonexistent \\"
echo "  -H 'Content-Type: application/json'"
echo ""
echo ""

# Test 4: OPTIONS - CORS preflight
echo "4. OPTIONS - CORS Preflight Check"
echo "--------------------------------------"
echo "curl -X OPTIONS \\"
echo "  ${API_ENDPOINT}/api/${USER_UUID} \\"
echo "  -H 'Origin: http://localhost:5173' \\"
echo "  -H 'Access-Control-Request-Method: POST' \\"
echo "  -H 'Access-Control-Request-Headers: Content-Type'"
echo ""
echo ""

# Pretty-print JSON response
echo "======================================"
echo "Tips:"
echo "======================================"
echo "• Add '| jq' to any curl command to pretty-print JSON"
echo "• Add '-v' flag to see full request/response headers"
echo "• Add '-w \"\\n\\nHTTP Status: %{http_code}\\n\"' to see status code"
echo ""
echo "Example with formatting:"
echo "  curl -X GET \${API_ENDPOINT}/api/\${USER_UUID} | jq"
echo ""
echo "Example with verbose output:"
echo "  curl -v -X GET \${API_ENDPOINT}/api/\${USER_UUID}"
echo ""

# Actual executable commands section
echo "======================================"
echo "Ready-to-run commands:"
echo "======================================"
echo ""
echo "After you set your API_ENDPOINT variable, run these:"
echo ""
echo "# Set your API endpoint"
echo 'export API_ENDPOINT="https://your-api-id.execute-api.us-east-2.amazonaws.com/prod"'
echo 'export USER_UUID="user-12345-test"'
echo ""
echo "# POST user state"
echo 'curl -X POST ${API_ENDPOINT}/api/${USER_UUID} -H "Content-Type: application/json" -d @test-data.json | jq'
echo ""
echo "# GET user state"
echo 'curl -X GET ${API_ENDPOINT}/api/${USER_UUID} -H "Content-Type: application/json" | jq'
echo ""
echo "# GET non-existent user"
echo 'curl -X GET ${API_ENDPOINT}/api/user-nonexistent -H "Content-Type: application/json" | jq'
echo ""
echo "# Test CORS"
echo 'curl -X OPTIONS ${API_ENDPOINT}/api/${USER_UUID} -H "Origin: http://localhost:5173" -v'
echo ""
