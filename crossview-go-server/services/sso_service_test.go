package services

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"crossview-go-server/lib"
	"crossview-go-server/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}

	err = db.AutoMigrate(&models.User{})
	if err != nil {
		t.Fatalf("Failed to migrate test database: %v", err)
	}

	return db
}

func setupTestLogger() lib.Logger {
	return lib.GetLogger()
}

func setupTestEnv() lib.Env {
	return lib.Env{
		CORSOrigin: "http://localhost:5173",
	}
}

func TestSSOService_GetSSOStatus(t *testing.T) {
	db := setupTestDB(t)
	logger := setupTestLogger()
	env := setupTestEnv()

	service := NewSSOService(logger, env, lib.Database{DB: db})
	config := service.GetSSOStatus()

	if config.Enabled {
		t.Error("Expected SSO to be disabled by default")
	}
}

func TestSSOService_InitiateOIDC_NotEnabled(t *testing.T) {
	db := setupTestDB(t)
	logger := setupTestLogger()
	env := setupTestEnv()

	service := NewSSOService(logger, env, lib.Database{DB: db})
	_, err := service.InitiateOIDC(context.Background(), "")

	if err == nil {
		t.Error("Expected error when OIDC is not enabled")
	}

	if err.Error() != "OIDC SSO is not enabled" {
		t.Errorf("Expected 'OIDC SSO is not enabled', got '%s'", err.Error())
	}
}

func TestSSOService_InitiateOIDC_WithIssuer(t *testing.T) {
	authEndpoint := "http://test-auth.example.com/auth"
	discoveryServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/.well-known/openid-configuration" {
			discovery := map[string]string{
				"authorization_endpoint": authEndpoint,
				"token_endpoint":          "http://test-auth.example.com/token",
				"userinfo_endpoint":       "http://test-auth.example.com/userinfo",
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(discovery)
		}
	}))
	defer discoveryServer.Close()

	db := setupTestDB(t)
	logger := setupTestLogger()
	env := setupTestEnv()

	service := SSOService{
		logger:    logger,
		env:       env,
		ssoConfig: lib.GetSSOConfig(env),
		userRepo:  models.NewUserRepository(db),
	}
	service.ssoConfig.Enabled = true
	service.ssoConfig.OIDC.Enabled = true
	service.ssoConfig.OIDC.Issuer = discoveryServer.URL
	service.ssoConfig.OIDC.ClientId = "test-client"
	service.ssoConfig.OIDC.CallbackURL = "http://localhost:3001/api/auth/oidc/callback"
	service.ssoConfig.OIDC.Scope = "openid profile email"

	authURL, err := service.InitiateOIDC(context.Background(), "")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if authURL == "" {
		t.Error("Expected auth URL to be generated")
	}

	if !strings.HasPrefix(authURL, authEndpoint) {
		t.Errorf("Expected auth URL to start with discovery authorization endpoint '%s', got: %s", authEndpoint, authURL)
	}

	if !strings.Contains(authURL, "client_id=test-client") {
		t.Error("Expected auth URL to contain client_id parameter")
	}
}

func TestSSOService_InitiateOIDC_WithAuthorizationURL(t *testing.T) {
	db := setupTestDB(t)
	logger := setupTestLogger()
	env := setupTestEnv()

	service := SSOService{
		logger:    logger,
		env:       env,
		ssoConfig: lib.GetSSOConfig(env),
		userRepo:  models.NewUserRepository(db),
	}
	service.ssoConfig.Enabled = true
	service.ssoConfig.OIDC.Enabled = true
	service.ssoConfig.OIDC.AuthorizationURL = "http://example.com/auth"
	service.ssoConfig.OIDC.ClientId = "test-client"
	service.ssoConfig.OIDC.CallbackURL = "http://localhost:3001/api/auth/oidc/callback"
	service.ssoConfig.OIDC.Scope = "openid profile email"

	authURL, err := service.InitiateOIDC(context.Background(), "")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if authURL == "" {
		t.Error("Expected auth URL to be generated")
	}
}

func TestSSOService_InitiateOIDC_NoConfig(t *testing.T) {
	db := setupTestDB(t)
	logger := setupTestLogger()
	env := setupTestEnv()

	service := SSOService{
		logger:    logger,
		env:       env,
		ssoConfig: lib.GetSSOConfig(env),
		userRepo:  models.NewUserRepository(db),
	}
	service.ssoConfig.Enabled = true
	service.ssoConfig.OIDC.Enabled = true
	service.ssoConfig.OIDC.ClientId = "test-client"
	service.ssoConfig.OIDC.CallbackURL = "http://localhost:3001/api/auth/oidc/callback"
	service.ssoConfig.OIDC.Scope = "openid profile email"
	service.ssoConfig.OIDC.Issuer = ""
	service.ssoConfig.OIDC.AuthorizationURL = ""

	_, err := service.InitiateOIDC(context.Background())
	if err == nil {
		t.Error("Expected error when authorization URL is not configured")
	}
}

func TestSSOService_HandleOIDCCallback_NotEnabled(t *testing.T) {
	db := setupTestDB(t)
	logger := setupTestLogger()
	env := setupTestEnv()

	service := NewSSOService(logger, env, lib.Database{DB: db})
	_, err := service.HandleOIDCCallback(context.Background(), "code", "state", "")

	if err == nil {
		t.Error("Expected error when OIDC is not enabled")
	}

	if err.Error() != "OIDC SSO is not enabled" {
		t.Errorf("Expected 'OIDC SSO is not enabled', got '%s'", err.Error())
	}
}

func TestSSOService_HandleOIDCCallback_Success(t *testing.T) {
	tokenServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		
		if r.Method != "POST" {
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(map[string]string{"error": "method_not_allowed"})
			return
		}
		
		if r.Header.Get("Content-Type") != "application/x-www-form-urlencoded" {
			r.ParseMultipartForm(10 << 20)
		} else {
			r.ParseForm()
		}
		
		grantType := r.FormValue("grant_type")
		if grantType != "authorization_code" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid_grant"})
			return
		}
		
		code := r.FormValue("code")
		if code == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid_request", "error_description": "code is required"})
			return
		}
		
		tokenResponse := map[string]string{
			"access_token": "test-access-token",
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(tokenResponse)
	}))
	defer tokenServer.Close()

	userInfoServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			userInfo := map[string]interface{}{
				"sub":                "user-123",
				"preferred_username": "testuser",
				"email":              "test@example.com",
				"given_name":         "Test",
				"family_name":        "User",
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(userInfo)
		}
	}))
	defer userInfoServer.Close()

	db := setupTestDB(t)
	logger := setupTestLogger()
	env := setupTestEnv()

	service := SSOService{
		logger:    logger,
		env:       env,
		ssoConfig: lib.GetSSOConfig(env),
		userRepo:  models.NewUserRepository(db),
	}
	service.ssoConfig.Enabled = true
	service.ssoConfig.OIDC.Enabled = true
	service.ssoConfig.OIDC.Issuer = ""
	service.ssoConfig.OIDC.TokenURL = tokenServer.URL
	service.ssoConfig.OIDC.UserInfoURL = userInfoServer.URL
	service.ssoConfig.OIDC.ClientId = "test-client"
	service.ssoConfig.OIDC.ClientSecret = "test-secret"
	service.ssoConfig.OIDC.CallbackURL = "http://localhost:3001/api/auth/oidc/callback"

	user, err := service.HandleOIDCCallback(context.Background(), "test-code", "test-state", "")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if user == nil {
		t.Fatal("Expected user to be created")
	}

	if user.Username != "testuser" {
		t.Errorf("Expected username 'testuser', got '%s'", user.Username)
	}

	if user.Email != "test@example.com" {
		t.Errorf("Expected email 'test@example.com', got '%s'", user.Email)
	}
}

func TestSSOService_HandleOIDCCallback_TokenExchangeFailure(t *testing.T) {
	tokenServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("invalid_grant"))
	}))
	defer tokenServer.Close()

	db := setupTestDB(t)
	logger := setupTestLogger()
	env := setupTestEnv()

	service := SSOService{
		logger:    logger,
		env:       env,
		ssoConfig: lib.GetSSOConfig(env),
		userRepo:  models.NewUserRepository(db),
	}
	service.ssoConfig.Enabled = true
	service.ssoConfig.OIDC.Enabled = true
	service.ssoConfig.OIDC.ClientId = "test-client"
	service.ssoConfig.OIDC.ClientSecret = "test-secret"
	service.ssoConfig.OIDC.CallbackURL = "http://localhost:3001/api/auth/oidc/callback"
	service.ssoConfig.OIDC.TokenURL = tokenServer.URL

	_, err := service.HandleOIDCCallback(context.Background(), "test-code", "test-state")
	if err == nil {
		t.Error("Expected error when token exchange fails")
	}
}

func TestSSOService_HandleOIDCCallback_UserInfoFailure(t *testing.T) {
	tokenServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenResponse := map[string]string{
			"access_token": "test-access-token",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(tokenResponse)
	}))
	defer tokenServer.Close()

	userInfoServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte("unauthorized"))
	}))
	defer userInfoServer.Close()

	db := setupTestDB(t)
	logger := setupTestLogger()
	env := setupTestEnv()

	service := SSOService{
		logger:    logger,
		env:       env,
		ssoConfig: lib.GetSSOConfig(env),
		userRepo:  models.NewUserRepository(db),
	}
	service.ssoConfig.Enabled = true
	service.ssoConfig.OIDC.Enabled = true
	service.ssoConfig.OIDC.ClientId = "test-client"
	service.ssoConfig.OIDC.ClientSecret = "test-secret"
	service.ssoConfig.OIDC.CallbackURL = "http://localhost:3001/api/auth/oidc/callback"
	service.ssoConfig.OIDC.TokenURL = tokenServer.URL
	service.ssoConfig.OIDC.UserInfoURL = userInfoServer.URL

	_, err := service.HandleOIDCCallback(context.Background(), "test-code", "test-state")
	if err == nil {
		t.Error("Expected error when userinfo request fails")
	}
}

func TestSSOService_HandleOIDCCallback_MissingUserInfo(t *testing.T) {
	tokenServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenResponse := map[string]string{
			"access_token": "test-access-token",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(tokenResponse)
	}))
	defer tokenServer.Close()

	userInfoServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userInfo := map[string]interface{}{}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(userInfo)
	}))
	defer userInfoServer.Close()

	db := setupTestDB(t)
	logger := setupTestLogger()
	env := setupTestEnv()

	service := SSOService{
		logger:    logger,
		env:       env,
		ssoConfig: lib.GetSSOConfig(env),
		userRepo:  models.NewUserRepository(db),
	}
	service.ssoConfig.Enabled = true
	service.ssoConfig.OIDC.Enabled = true
	service.ssoConfig.OIDC.ClientId = "test-client"
	service.ssoConfig.OIDC.ClientSecret = "test-secret"
	service.ssoConfig.OIDC.CallbackURL = "http://localhost:3001/api/auth/oidc/callback"
	service.ssoConfig.OIDC.TokenURL = tokenServer.URL
	service.ssoConfig.OIDC.UserInfoURL = userInfoServer.URL

	_, err := service.HandleOIDCCallback(context.Background(), "test-code", "test-state")
	if err == nil {
		t.Error("Expected error when userinfo is missing username and email")
	}
}

func TestSSOService_InitiateSAML_NotEnabled(t *testing.T) {
	db := setupTestDB(t)
	logger := setupTestLogger()
	env := setupTestEnv()

	service := NewSSOService(logger, env, lib.Database{DB: db})
	_, err := service.InitiateSAML(context.Background(), "")

	if err == nil {
		t.Error("Expected error when SAML is not enabled")
	}

	if err.Error() != "SAML SSO is not enabled" {
		t.Errorf("Expected 'SAML SSO is not enabled', got '%s'", err.Error())
	}
}

func TestSSOService_InitiateSAML_Success(t *testing.T) {
	db := setupTestDB(t)
	logger := setupTestLogger()
	env := setupTestEnv()

	service := SSOService{
		logger:    logger,
		env:       env,
		ssoConfig: lib.GetSSOConfig(env),
		userRepo:  models.NewUserRepository(db),
	}
	service.ssoConfig.Enabled = true
	service.ssoConfig.SAML.Enabled = true
	service.ssoConfig.SAML.EntryPoint = "http://example.com/saml/login"

	entryPoint, err := service.InitiateSAML(context.Background(), "")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if entryPoint != "http://example.com/saml/login" {
		t.Errorf("Expected entry point 'http://example.com/saml/login', got '%s'", entryPoint)
	}
}

func TestSSOService_InitiateSAML_NoEntryPoint(t *testing.T) {
	db := setupTestDB(t)
	logger := setupTestLogger()
	env := setupTestEnv()

	service := SSOService{
		logger:    logger,
		env:       env,
		ssoConfig: lib.GetSSOConfig(env),
		userRepo:  models.NewUserRepository(db),
	}
	service.ssoConfig.Enabled = true
	service.ssoConfig.SAML.Enabled = true
	service.ssoConfig.SAML.EntryPoint = ""

	_, err := service.InitiateSAML(context.Background(), "")
	if err == nil {
		t.Error("Expected error when entry point is not configured")
	}
	
	if err.Error() != "SAML entry point not configured" {
		t.Errorf("Expected error message 'SAML entry point not configured', got '%s'", err.Error())
	}
}

func TestSSOService_HandleSAMLCallback_NotEnabled(t *testing.T) {
	db := setupTestDB(t)
	logger := setupTestLogger()
	env := setupTestEnv()

	service := NewSSOService(logger, env, lib.Database{DB: db})
	_, err := service.HandleSAMLCallback(context.Background(), "saml-response", "")

	if err == nil {
		t.Error("Expected error when SAML is not enabled")
	}

	if err.Error() != "SAML SSO is not enabled" {
		t.Errorf("Expected 'SAML SSO is not enabled', got '%s'", err.Error())
	}
}

func TestSSOService_HandleSAMLCallback_NotImplemented(t *testing.T) {
	db := setupTestDB(t)
	logger := setupTestLogger()
	env := setupTestEnv()

	service := SSOService{
		logger:    logger,
		env:       env,
		ssoConfig: lib.GetSSOConfig(env),
		userRepo:  models.NewUserRepository(db),
	}
	service.ssoConfig.Enabled = true
	service.ssoConfig.SAML.Enabled = true

	_, err := service.HandleSAMLCallback(context.Background(), "saml-response", "")
	if err == nil {
		t.Error("Expected error for not implemented SAML callback")
	}
}

