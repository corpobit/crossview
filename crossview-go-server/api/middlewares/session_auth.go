package middlewares

import (
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"crossview-go-server/lib"
	"crossview-go-server/models"
)

type SessionAuthMiddleware struct {
	handler lib.RequestHandler
	logger  lib.Logger
	env     lib.Env
}

func NewSessionAuthMiddleware(handler lib.RequestHandler, logger lib.Logger, env lib.Env) SessionAuthMiddleware {
	return SessionAuthMiddleware{
		handler: handler,
		logger:  logger,
		env:     env,
	}
}

func (m SessionAuthMiddleware) Setup() {
	m.logger.Info("Setting up session auth middleware")
}

func (m SessionAuthMiddleware) Handler() gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		userID := session.Get("userId")
		
		if userID == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}
		
		c.Set("userId", userID)
		c.Next()
	}
}

func RequireAdmin(userRepo *models.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)
		userID := session.Get("userId")
		
		if userID == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}
		
		user, err := userRepo.FindByID(userID.(uint))
		if err != nil || user == nil || user.Role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			c.Abort()
			return
		}
		
		c.Set("userId", userID)
		c.Next()
	}
}

