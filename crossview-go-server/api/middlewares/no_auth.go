package middlewares

import (
	"crypto/rand"
	"net/http"

	"crossview-go-server/lib"
	"crossview-go-server/models"

	"github.com/gin-gonic/gin"
)

const anonymousUsername = "anonymous"

type NoAuthMiddleware struct {
	logger   lib.Logger
	userRepo *models.UserRepository
}

func NewNoAuthMiddleware(logger lib.Logger, userRepo *models.UserRepository) NoAuthMiddleware {
	return NoAuthMiddleware{
		logger:   logger,
		userRepo: userRepo,
	}
}

func (m NoAuthMiddleware) Handler() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, err := m.userRepo.FindByUsername(anonymousUsername)
		if err != nil || user == nil {
			user = &models.User{
				Username: anonymousUsername,
				Email:    "anonymous@local",
				Role:     "viewer",
			}
			if err := user.SetPassword(noAuthRandomPassword()); err != nil {
				m.logger.Error("NoAuth: failed to set password: " + err.Error())
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
				c.Abort()
				return
			}
			if err := m.userRepo.Create(user); err != nil {
				m.logger.Error("NoAuth: failed to create anonymous user: " + err.Error())
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
				c.Abort()
				return
			}
		}
		c.Set("userId", user.ID)
		c.Next()
	}
}

func noAuthRandomPassword() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 32)
	rand.Read(b)
	for i := range b {
		b[i] = charset[b[i]%byte(len(charset))]
	}
	return string(b)
}
