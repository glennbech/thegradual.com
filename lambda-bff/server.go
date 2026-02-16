package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"github.com/golang-jwt/jwt/v5"
)

// Config holds the Cognito configuration
type Config struct {
	CognitoDomain   string
	ClientID        string
	ClientSecret    string
	RedirectURI     string
	FrontendURL     string
	CookieDomain    string
	SecureFlag      bool
}

// TokenResponse from Cognito
type TokenResponse struct {
	IDToken      string `json:"id_token"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

// LoginRequest from frontend
type LoginRequest struct {
	Code        string `json:"code"`
	RedirectURI string `json:"redirect_uri"`
}

// LoginResponse to frontend
type LoginResponse struct {
	IDToken     string                 `json:"id_token"`
	AccessToken string                 `json:"access_token"`
	ExpiresIn   int                    `json:"expires_in"`
	User        map[string]interface{} `json:"user"`
}

// RefreshResponse to frontend
type RefreshResponse struct {
	IDToken     string                 `json:"id_token"`
	AccessToken string                 `json:"access_token"`
	ExpiresIn   int                    `json:"expires_in"`
	User        map[string]interface{} `json:"user"`
}

var config Config
var httpClient *http.Client

func init() {
	config = Config{
		CognitoDomain: os.Getenv("COGNITO_DOMAIN"),
		ClientID:      os.Getenv("COGNITO_CLIENT_ID"),
		ClientSecret:  os.Getenv("COGNITO_CLIENT_SECRET"),
		RedirectURI:   os.Getenv("REDIRECT_URI"),
		FrontendURL:   os.Getenv("FRONTEND_URL"),
		CookieDomain:  os.Getenv("COOKIE_DOMAIN"),
		SecureFlag:    os.Getenv("COOKIE_SECURE") != "false",
	}

	if config.CognitoDomain == "" || config.ClientID == "" || config.ClientSecret == "" {
		log.Fatal("Missing required environment variables: COGNITO_DOMAIN, COGNITO_CLIENT_ID, COGNITO_CLIENT_SECRET")
	}

	// Create HTTP client with logging transport
	httpClient = &http.Client{
		Transport: &loggingTransport{
			Transport: http.DefaultTransport,
		},
	}
}

// isAllowedRedirectURI checks if a redirect URI is in the allowed list
func isAllowedRedirectURI(uri string) bool {
	allowedURIs := os.Getenv("ALLOWED_REDIRECT_URIS")
	if allowedURIs == "" {
		// Fall back to default redirect URI
		return uri == config.RedirectURI
	}

	// Split comma-separated list and check
	for _, allowed := range strings.Split(allowedURIs, ",") {
		if strings.TrimSpace(allowed) == uri {
			return true
		}
	}
	return false
}

// loggingTransport wraps http.RoundTripper to log requests and responses
type loggingTransport struct {
	Transport http.RoundTripper
}

func (t *loggingTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// Log the outgoing request
	reqDump, err := httputil.DumpRequestOut(req, true)
	if err != nil {
		log.Printf("Error dumping request: %v", err)
	} else {
		log.Printf("===== HTTP REQUEST TO COGNITO =====\n%s\n===== END REQUEST =====", string(reqDump))
	}

	// Perform the actual request
	resp, err := t.Transport.RoundTrip(req)
	if err != nil {
		return nil, err
	}

	// Log the response
	respDump, err := httputil.DumpResponse(resp, true)
	if err != nil {
		log.Printf("Error dumping response: %v", err)
	} else {
		log.Printf("===== HTTP RESPONSE FROM COGNITO =====\n%s\n===== END RESPONSE =====", string(respDump))
	}

	return resp, nil
}

func main() {
	mux := http.NewServeMux()

	// Use mux directly - CORS handled by AWS Lambda Function URL

	// Auth endpoints
	mux.HandleFunc("/auth/authorize", handleAuthorize)
	mux.HandleFunc("/auth/callback", handleCallback)
	mux.HandleFunc("/auth/login", handleLogin)
	mux.HandleFunc("/auth/refresh", handleRefresh)
	mux.HandleFunc("/auth/logout", handleLogout)
	mux.HandleFunc("/auth/verify", handleVerify)

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Start Lambda handler
	lambda.Start(httpadapter.NewV2(mux).ProxyWithContext)
}


// handleAuthorize initiates the OAuth flow by redirecting to Cognito
func handleAuthorize(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Generate state parameter for CSRF protection
	state := generateRandomString(32)

	// Build Cognito authorize URL
	authorizeURL := fmt.Sprintf(
		"https://%s/oauth2/authorize?client_id=%s&response_type=code&scope=openid+email+profile&redirect_uri=%s&state=%s",
		config.CognitoDomain,
		config.ClientID,
		url.QueryEscape(getBFFCallbackURL()),
		state,
	)

	// Store state in cookie for verification (optional but recommended)
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Path:     "/",
		HttpOnly: true,
		Secure:   config.SecureFlag,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   300, // 5 minutes
	})

	// Redirect to Cognito
	http.Redirect(w, r, authorizeURL, http.StatusFound)
}

// handleCallback handles the OAuth callback from Cognito
func handleCallback(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get authorization code from query params
	code := r.URL.Query().Get("code")
	if code == "" {
		// Check for error from Cognito
		if errMsg := r.URL.Query().Get("error"); errMsg != "" {
			log.Printf("OAuth error: %s - %s", errMsg, r.URL.Query().Get("error_description"))
			http.Error(w, fmt.Sprintf("Authentication failed: %s", errMsg), http.StatusUnauthorized)
			return
		}
		http.Error(w, "Missing authorization code", http.StatusBadRequest)
		return
	}

	// Verify state parameter (optional but recommended)
	state := r.URL.Query().Get("state")
	if cookie, err := r.Cookie("oauth_state"); err == nil {
		if cookie.Value != state {
			log.Printf("State mismatch: cookie=%s, param=%s", cookie.Value, state)
			http.Error(w, "Invalid state parameter", http.StatusBadRequest)
			return
		}
	}

	// Clear state cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   config.SecureFlag,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})

	// Exchange code for tokens
	tokens, err := exchangeCodeForTokens(code, getBFFCallbackURL())
	if err != nil {
		log.Printf("Token exchange failed: %v", err)
		http.Error(w, "Authentication failed", http.StatusUnauthorized)
		return
	}

	// Set refresh token as httpOnly cookie
	setRefreshTokenCookie(w, tokens.RefreshToken)

	// Build frontend redirect URL with tokens in query params
	// Note: This is temporary - tokens should ideally be in httpOnly cookies only
	frontendURL := getFrontendURL()
	redirectURL := fmt.Sprintf("%s?id_token=%s&access_token=%s&expires_in=%d",
		frontendURL,
		url.QueryEscape(tokens.IDToken),
		url.QueryEscape(tokens.AccessToken),
		tokens.ExpiresIn,
	)

	// Redirect back to frontend
	http.Redirect(w, r, redirectURL, http.StatusFound)
}

// getBFFCallbackURL returns the BFF callback URL
func getBFFCallbackURL() string {
	// Get Lambda Function URL from environment or construct it
	bffURL := os.Getenv("BFF_URL")
	if bffURL == "" {
		// Fallback - should be set in Lambda environment
		bffURL = "https://cwxiir473hvnurcous3ogcz3xa0anqfc.lambda-url.us-east-2.on.aws"
	}
	return bffURL + "/auth/callback"
}

// getFrontendURL returns the frontend URL for redirect
func getFrontendURL() string {
	frontendURL := config.FrontendURL
	if frontendURL == "" {
		frontendURL = config.RedirectURI // Fallback to REDIRECT_URI
	}
	return frontendURL
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Code == "" {
		http.Error(w, "Missing authorization code", http.StatusBadRequest)
		return
	}

	// Validate redirect URI if provided, otherwise use default
	redirectURI := config.RedirectURI
	if req.RedirectURI != "" {
		if !isAllowedRedirectURI(req.RedirectURI) {
			log.Printf("Invalid redirect URI: %s", req.RedirectURI)
			http.Error(w, "Invalid redirect URI", http.StatusBadRequest)
			return
		}
		redirectURI = req.RedirectURI
	}

	// Exchange code for tokens with Cognito
	tokens, err := exchangeCodeForTokens(req.Code, redirectURI)
	if err != nil {
		log.Printf("Token exchange failed: %v", err)
		http.Error(w, "Authentication failed", http.StatusUnauthorized)
		return
	}

	// Decode user information from ID token
	user, err := decodeIDToken(tokens.IDToken)
	if err != nil {
		log.Printf("Failed to decode ID token: %v", err)
		http.Error(w, "Failed to decode user information", http.StatusInternalServerError)
		return
	}

	// Set refresh token as httpOnly cookie
	setRefreshTokenCookie(w, tokens.RefreshToken)

	// Send access token, ID token and user info to frontend
	response := LoginResponse{
		IDToken:     tokens.IDToken,
		AccessToken: tokens.AccessToken,
		ExpiresIn:   tokens.ExpiresIn,
		User:        user,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleRefresh(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get refresh token from cookie
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		http.Error(w, "No refresh token found", http.StatusUnauthorized)
		return
	}

	// Use refresh token to get new tokens
	tokens, err := refreshTokens(cookie.Value)
	if err != nil {
		log.Printf("Token refresh failed: %v", err)
		http.Error(w, "Token refresh failed", http.StatusUnauthorized)
		return
	}

	// Decode user information from new ID token
	user, err := decodeIDToken(tokens.IDToken)
	if err != nil {
		log.Printf("Failed to decode ID token: %v", err)
		http.Error(w, "Failed to decode user information", http.StatusInternalServerError)
		return
	}

	// If Cognito returns a new refresh token, update the cookie
	if tokens.RefreshToken != "" {
		setRefreshTokenCookie(w, tokens.RefreshToken)
	}

	// Send new ID token and access token to frontend
	response := RefreshResponse{
		IDToken:     tokens.IDToken,
		AccessToken: tokens.AccessToken,
		ExpiresIn:   tokens.ExpiresIn,
		User:        user,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Clear the refresh token cookie
	clearRefreshTokenCookie(w)

	// Optionally: Call Cognito's revoke endpoint if you want to revoke the token
	// This requires the refresh token from the cookie
	if cookie, err := r.Cookie("refresh_token"); err == nil {
		// Best effort - don't fail logout if revoke fails
		_ = revokeToken(cookie.Value)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"success":true}`))
}

func handleVerify(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "No authorization header", http.StatusUnauthorized)
		return
	}

	// Extract token from "Bearer <token>" format
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
		return
	}

	// For now, just decode the token to verify it's valid
	// In production, you might want to verify with Cognito's JWKS endpoint
	user, err := decodeIDToken(parts[1])
	if err != nil {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"valid": true,
		"user":  user,
	})
}

func exchangeCodeForTokens(code string, redirectURI string) (*TokenResponse, error) {
	tokenURL := fmt.Sprintf("https://%s/oauth2/token", config.CognitoDomain)

	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("client_id", config.ClientID)
	data.Set("client_secret", config.ClientSecret)
	data.Set("code", code)
	data.Set("redirect_uri", redirectURI)

	// Create request with custom client
	req, err := http.NewRequest("POST", tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf(
			"token exchange failed with status %d\nBody: %s",
			resp.StatusCode,
			string(bodyBytes),
		)
	}

	var tokenResp TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

func refreshTokens(refreshToken string) (*TokenResponse, error) {
	tokenURL := fmt.Sprintf("https://%s/oauth2/token", config.CognitoDomain)

	data := url.Values{}
	data.Set("grant_type", "refresh_token")
	data.Set("client_id", config.ClientID)
	data.Set("client_secret", config.ClientSecret)
	data.Set("refresh_token", refreshToken)

	// Create request with custom client
	req, err := http.NewRequest("POST", tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf(
			"token refresh failed with status %d\nBody: %s",
			resp.StatusCode,
			string(bodyBytes),
		)
	}

	var tokenResp TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

func revokeToken(token string) error {
	revokeURL := fmt.Sprintf("https://%s/oauth2/revoke", config.CognitoDomain)

	data := url.Values{}
	data.Set("token", token)
	data.Set("client_id", config.ClientID)
	data.Set("client_secret", config.ClientSecret)

	// Create request with custom client
	req, err := http.NewRequest("POST", revokeURL, strings.NewReader(data.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf(
			"token revocation failed with status %d\nBody: %s",
			resp.StatusCode,
			string(bodyBytes),
		)
	}

	return nil
}

func decodeIDToken(tokenString string) (map[string]interface{}, error) {
	// Parse without verification for now
	// In production, you should verify with Cognito's JWKS
	token, _, err := new(jwt.Parser).ParseUnverified(tokenString, jwt.MapClaims{})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	// Extract relevant user information
	user := make(map[string]interface{})
	if email, ok := claims["email"].(string); ok {
		user["email"] = email
	}
	if name, ok := claims["name"].(string); ok {
		user["name"] = name
	}
	if givenName, ok := claims["given_name"].(string); ok {
		user["given_name"] = givenName
	}
	if familyName, ok := claims["family_name"].(string); ok {
		user["family_name"] = familyName
	}
	if sub, ok := claims["sub"].(string); ok {
		user["sub"] = sub
	}

	return user, nil
}

func setRefreshTokenCookie(w http.ResponseWriter, token string) {
	// Generate a secure cookie name to prevent CSRF
	cookieName := "refresh_token"

	cookie := &http.Cookie{
		Name:     cookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   config.SecureFlag,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   30 * 24 * 60 * 60, // 30 days
	}

	if config.CookieDomain != "" {
		cookie.Domain = config.CookieDomain
	}

	http.SetCookie(w, cookie)
}

func clearRefreshTokenCookie(w http.ResponseWriter) {
	cookie := &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   config.SecureFlag,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   -1, // Delete the cookie
	}

	if config.CookieDomain != "" {
		cookie.Domain = config.CookieDomain
	}

	http.SetCookie(w, cookie)
}

// Generate a random string for CSRF tokens if needed
func generateRandomString(length int) string {
	bytes := make([]byte, length)
	rand.Read(bytes)
	return base64.URLEncoding.EncodeToString(bytes)
}