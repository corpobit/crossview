package middlewares

import (
	"io"
	"log"
	"os"
	"strings"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"crossview-go-server/lib"
)

type filteredWriter struct {
	writer io.Writer
}

func (w *filteredWriter) Write(p []byte) (n int, err error) {
	message := string(p)
	if strings.Contains(message, "securecookie: the value is not valid") {
		return len(p), nil
	}
	return w.writer.Write(p)
}

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
	
	filteredLog := &filteredWriter{writer: os.Stderr}
	log.SetOutput(filteredLog)
	log.SetPrefix("")
	
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

