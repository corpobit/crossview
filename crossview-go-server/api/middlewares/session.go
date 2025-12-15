package middlewares

import (
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"crossview-go-server/lib"
)

type SessionMiddleware struct {
	handler lib.RequestHandler
	logger  lib.Logger
	env     lib.Env
}

func NewSessionMiddleware(handler lib.RequestHandler, logger lib.Logger, env lib.Env) SessionMiddleware {
	return SessionMiddleware{
		handler: handler,
		logger:  logger,
		env:     env,
	}
}

func (m SessionMiddleware) Setup() {
	m.logger.Info("Setting up session middleware")
	
	store := cookie.NewStore([]byte(m.env.SessionSecret))
	
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: true,
		Secure:   m.env.Environment == "production",
		SameSite: 1,
	})
	
	m.handler.Gin.Use(sessions.Sessions("session", store))
}

