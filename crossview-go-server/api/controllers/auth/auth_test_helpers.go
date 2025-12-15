package auth

import (
	"testing"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"crossview-go-server/lib"
	"crossview-go-server/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

func setupTestSessionStore() sessions.Store {
	store := cookie.NewStore([]byte("test-secret-key"))
	return store
}

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

func createTestUser(t *testing.T, db *gorm.DB, username, email, password, role string) *models.User {
	user := &models.User{
		Username: username,
		Email:    email,
		Role:     role,
	}
	if err := user.SetPassword(password); err != nil {
		t.Fatalf("Failed to set password: %v", err)
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}
	return user
}

