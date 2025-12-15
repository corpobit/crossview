package middlewares

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"crossview-go-server/lib"
)

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

func setupTestLogger() lib.Logger {
	return lib.GetLogger()
}

func setupTestEnv() lib.Env {
	return lib.NewEnv()
}

func setupTestRequestHandler() lib.RequestHandler {
	return lib.NewRequestHandler(setupTestLogger())
}

func TestSessionAuthMiddleware_Handler_Unauthorized(t *testing.T) {
	router := setupTestRouter()
	logger := setupTestLogger()
	env := setupTestEnv()
	handler := setupTestRequestHandler()

	store := cookie.NewStore([]byte(env.SessionSecret))
	router.Use(sessions.Sessions("session", store))

	middleware := NewSessionAuthMiddleware(handler, logger, env)
	router.GET("/test", middleware.Handler(), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status code %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestSessionAuthMiddleware_Handler_Authorized(t *testing.T) {
	router := setupTestRouter()
	logger := setupTestLogger()
	env := setupTestEnv()
	handler := setupTestRequestHandler()

	store := cookie.NewStore([]byte(env.SessionSecret))
	router.Use(sessions.Sessions("session", store))

	middleware := NewSessionAuthMiddleware(handler, logger, env)
	router.GET("/test", middleware.Handler(), func(c *gin.Context) {
		userID, _ := c.Get("userId")
		c.JSON(http.StatusOK, gin.H{"userId": userID})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	session, _ := store.Get(req, "session")
	session.Values["userId"] = uint(1)
	session.Save(req, w)

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}
}

func TestSessionAuthMiddleware_Setup(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()
	handler := setupTestRequestHandler()

	middleware := NewSessionAuthMiddleware(handler, logger, env)
	middleware.Setup()
}

