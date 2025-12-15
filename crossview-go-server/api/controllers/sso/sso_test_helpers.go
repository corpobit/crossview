package sso

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

func setupTestSessionStore() sessions.Store {
	store := cookie.NewStore([]byte("test-secret-key"))
	return store
}

