package middlewares

import (
	"crypto/rand"
	"net/http"

	"github.com/gin-gonic/gin"
	"crossview-go-server/lib"
	"crossview-go-server/models"
)

type HeaderAuthMiddleware struct {
	env      lib.Env
	logger   lib.Logger
	userRepo *models.UserRepository
}

func NewHeaderAuthMiddleware(env lib.Env, logger lib.Logger, userRepo *models.UserRepository) HeaderAuthMiddleware {
	return HeaderAuthMiddleware{
		env:      env,
		logger:   logger,
		userRepo: userRepo,
	}
}

func (m HeaderAuthMiddleware) Handler() gin.HandlerFunc {
	return func(c *gin.Context) {
		username := c.GetHeader(m.env.AuthTrustedHeader)
		if username == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}
		user, err := m.userRepo.FindByUsername(username)
		if err != nil || user == nil {
			if !m.env.AuthCreateUsers {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
				c.Abort()
				return
			}
			user = &models.User{
				Username: username,
				Email:    username + "@header.local",
				Role:     m.env.AuthDefaultRole,
			}
			if err := user.SetPassword(headerRandomPassword()); err != nil {
				m.logger.Error("Header auth: failed to set password: " + err.Error())
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
				c.Abort()
				return
			}
			if err := m.userRepo.Create(user); err != nil {
				m.logger.Error("Header auth: failed to create user: " + err.Error())
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
				c.Abort()
				return
			}
		}
		c.Set("userId", user.ID)
		c.Next()
	}
}

func headerRandomPassword() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 32)
	rand.Read(b)
	for i := range b {
		b[i] = charset[b[i]%byte(len(charset))]
	}
	return string(b)
}
