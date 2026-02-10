package auth

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"crossview-go-server/lib"
)

func TestAuthController_Check_NotAuthenticated(t *testing.T) {
	router := setupTestRouter()
	store := setupTestSessionStore()
	router.Use(sessions.Sessions("session", store))

	db := setupTestDB(t)
	logger := setupTestLogger()

	controller := NewAuthController(logger, lib.Database{DB: db})

	router.GET("/api/auth/check", controller.Check)

	req, _ := http.NewRequest("GET", "/api/auth/check", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if authenticated, ok := response["authenticated"].(bool); !ok || authenticated {
		t.Error("Expected authenticated to be false")
	}
}

func TestAuthController_Check_Authenticated(t *testing.T) {
	router := setupTestRouter()
	store := setupTestSessionStore()
	router.Use(sessions.Sessions("session", store))

	db := setupTestDB(t)
	logger := setupTestLogger()

	user := createTestUser(t, db, "testuser", "test@example.com", "password123", "user")

	controller := NewAuthController(logger, lib.Database{DB: db})

	router.GET("/api/auth/check", func(c *gin.Context) {
		session := sessions.Default(c)
		session.Set("userId", user.ID)
		session.Set("userRole", user.Role)
		session.Save()
		controller.Check(c)
	})

	req, _ := http.NewRequest("GET", "/api/auth/check", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if authenticated, ok := response["authenticated"].(bool); !ok || !authenticated {
		t.Error("Expected authenticated to be true")
	}

	userData, ok := response["user"].(map[string]interface{})
	if !ok {
		t.Fatal("Expected user data in response")
	}

	if userData["id"].(float64) != float64(user.ID) {
		t.Errorf("Expected user ID %d, got %v", user.ID, userData["id"])
	}
}

func TestAuthController_Check_InvalidSession(t *testing.T) {
	router := setupTestRouter()
	store := setupTestSessionStore()
	router.Use(sessions.Sessions("session", store))

	db := setupTestDB(t)
	logger := setupTestLogger()

	controller := NewAuthController(logger, lib.Database{DB: db})

	router.GET("/api/auth/check", func(c *gin.Context) {
		session := sessions.Default(c)
		session.Set("userId", uint(99999))
		session.Save()
		controller.Check(c)
	})

	req, _ := http.NewRequest("GET", "/api/auth/check", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if authenticated, ok := response["authenticated"].(bool); !ok || authenticated {
		t.Error("Expected authenticated to be false for invalid user ID")
	}
}

func TestAuthController_Login_Success(t *testing.T) {
	router := setupTestRouter()
	store := setupTestSessionStore()
	router.Use(sessions.Sessions("session", store))

	db := setupTestDB(t)
	logger := setupTestLogger()

	createTestUser(t, db, "testuser", "test@example.com", "password123", "user")

	controller := NewAuthController(logger, lib.Database{DB: db})

	router.POST("/api/auth/login", controller.Login)

	loginData := map[string]string{
		"username": "testuser",
		"password": "password123",
	}
	jsonData, _ := json.Marshal(loginData)

	req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	userData, ok := response["user"].(map[string]interface{})
	if !ok {
		t.Fatal("Expected user data in response")
	}

	if userData["username"] != "testuser" {
		t.Errorf("Expected username 'testuser', got '%v'", userData["username"])
	}
}

func TestAuthController_Login_InvalidCredentials(t *testing.T) {
	router := setupTestRouter()
	store := setupTestSessionStore()
	router.Use(sessions.Sessions("session", store))

	db := setupTestDB(t)
	logger := setupTestLogger()

	createTestUser(t, db, "testuser", "test@example.com", "password123", "user")

	controller := NewAuthController(logger, lib.Database{DB: db})

	router.POST("/api/auth/login", controller.Login)

	loginData := map[string]string{
		"username": "testuser",
		"password": "wrongpassword",
	}
	jsonData, _ := json.Marshal(loginData)

	req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status code %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestAuthController_Login_MissingFields(t *testing.T) {
	router := setupTestRouter()
	store := setupTestSessionStore()
	router.Use(sessions.Sessions("session", store))

	db := setupTestDB(t)
	logger := setupTestLogger()

	controller := NewAuthController(logger, lib.Database{DB: db})

	router.POST("/api/auth/login", controller.Login)

	loginData := map[string]string{
		"username": "testuser",
	}
	jsonData, _ := json.Marshal(loginData)

	req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status code %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestAuthController_Login_UserNotFound(t *testing.T) {
	router := setupTestRouter()
	store := setupTestSessionStore()
	router.Use(sessions.Sessions("session", store))

	db := setupTestDB(t)
	logger := setupTestLogger()

	controller := NewAuthController(logger, lib.Database{DB: db})

	router.POST("/api/auth/login", controller.Login)

	loginData := map[string]string{
		"username": "nonexistent",
		"password": "password123",
	}
	jsonData, _ := json.Marshal(loginData)

	req, _ := http.NewRequest("POST", "/api/auth/login", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status code %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestAuthController_Logout_Success(t *testing.T) {
	router := setupTestRouter()
	store := setupTestSessionStore()
	router.Use(sessions.Sessions("session", store))

	db := setupTestDB(t)
	logger := setupTestLogger()

	controller := NewAuthController(logger, lib.Database{DB: db})

	router.POST("/api/auth/logout", controller.Logout)

	req, _ := http.NewRequest("POST", "/api/auth/logout", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if success, ok := response["success"].(bool); !ok || !success {
		t.Error("Expected success to be true")
	}
}

func TestAuthController_Register_Success(t *testing.T) {
	router := setupTestRouter()
	store := setupTestSessionStore()
	router.Use(sessions.Sessions("session", store))

	db := setupTestDB(t)
	logger := setupTestLogger()

	controller := NewAuthController(logger, lib.Database{DB: db})

	router.POST("/api/auth/register", controller.Register)

	registerData := map[string]string{
		"username": "newuser",
		"email":    "newuser@example.com",
		"password": "password123",
	}
	jsonData, _ := json.Marshal(registerData)

	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	userData, ok := response["user"].(map[string]interface{})
	if !ok {
		t.Fatal("Expected user data in response")
	}

	if userData["username"] != "newuser" {
		t.Errorf("Expected username 'newuser', got '%v'", userData["username"])
	}

	if userData["role"] != "admin" {
		t.Errorf("Expected role 'admin' for first user, got '%v'", userData["role"])
	}
}

func TestAuthController_Register_RegistrationDisabled(t *testing.T) {
	router := setupTestRouter()
	store := setupTestSessionStore()
	router.Use(sessions.Sessions("session", store))

	db := setupTestDB(t)
	logger := setupTestLogger()

	createTestUser(t, db, "existinguser", "existing@example.com", "password123", "user")

	controller := NewAuthController(logger, lib.Database{DB: db})

	router.POST("/api/auth/register", controller.Register)

	registerData := map[string]string{
		"username": "newuser",
		"email":    "newuser@example.com",
		"password": "password123",
	}
	jsonData, _ := json.Marshal(registerData)

	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected status code %d, got %d", http.StatusForbidden, w.Code)
	}
}

func TestAuthController_Register_DuplicateUsername(t *testing.T) {
	router := setupTestRouter()
	store := setupTestSessionStore()
	router.Use(sessions.Sessions("session", store))

	db := setupTestDB(t)
	logger := setupTestLogger()

	controller := NewAuthController(logger, lib.Database{DB: db})

	router.POST("/api/auth/register", controller.Register)

	registerData1 := map[string]string{
		"username": "testuser",
		"email":    "test@example.com",
		"password": "password123",
	}
	jsonData1, _ := json.Marshal(registerData1)

	req1, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonData1))
	req1.Header.Set("Content-Type", "application/json")
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)

	if w1.Code != http.StatusOK {
		t.Fatalf("First registration should succeed, got status %d", w1.Code)
	}

	registerData2 := map[string]string{
		"username": "testuser",
		"email":    "different@example.com",
		"password": "password123",
	}
	jsonData2, _ := json.Marshal(registerData2)

	req2, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonData2))
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	if w2.Code != http.StatusForbidden {
		t.Errorf("Expected status code %d (registration disabled after first user), got %d", http.StatusForbidden, w2.Code)
	}
}

func TestAuthController_Register_DuplicateEmail(t *testing.T) {
	router := setupTestRouter()
	store := setupTestSessionStore()
	router.Use(sessions.Sessions("session", store))

	db := setupTestDB(t)
	logger := setupTestLogger()

	controller := NewAuthController(logger, lib.Database{DB: db})

	router.POST("/api/auth/register", controller.Register)

	registerData1 := map[string]string{
		"username": "testuser1",
		"email":    "test@example.com",
		"password": "password123",
	}
	jsonData1, _ := json.Marshal(registerData1)

	req1, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonData1))
	req1.Header.Set("Content-Type", "application/json")
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)

	if w1.Code != http.StatusOK {
		t.Fatalf("First registration should succeed, got status %d", w1.Code)
	}

	registerData2 := map[string]string{
		"username": "testuser2",
		"email":    "test@example.com",
		"password": "password123",
	}
	jsonData2, _ := json.Marshal(registerData2)

	req2, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonData2))
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	if w2.Code != http.StatusForbidden {
		t.Errorf("Expected status code %d (registration disabled after first user), got %d", http.StatusForbidden, w2.Code)
	}
}

func TestAuthController_Register_MissingFields(t *testing.T) {
	router := setupTestRouter()
	store := setupTestSessionStore()
	router.Use(sessions.Sessions("session", store))

	db := setupTestDB(t)
	logger := setupTestLogger()

	controller := NewAuthController(logger, lib.Database{DB: db})

	router.POST("/api/auth/register", controller.Register)

	registerData := map[string]string{
		"username": "newuser",
	}
	jsonData, _ := json.Marshal(registerData)

	req, _ := http.NewRequest("POST", "/api/auth/register", bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status code %d, got %d", http.StatusBadRequest, w.Code)
	}
}

