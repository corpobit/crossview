package middlewares

import (
	"crossview-go-server/lib"

	"github.com/gin-gonic/gin"
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(NewCorsMiddleware),
	fx.Provide(NewSessionMiddleware),
	fx.Provide(NewSessionAuthMiddleware),
	fx.Provide(NewHeaderAuthMiddleware),
	fx.Provide(NewNoAuthMiddleware),
	fx.Provide(NewAuthMiddleware),
	fx.Provide(NewMiddlewares),
)

type IMiddleware interface {
	Setup()
}

type Middlewares []IMiddleware

func NewMiddlewares(
	corsMiddleware CorsMiddleware,
	sessionMiddleware SessionMiddleware,
) Middlewares {
	return Middlewares{
		corsMiddleware,
		sessionMiddleware,
	}
}

func (m Middlewares) Setup() {
	for _, middleware := range m {
		middleware.Setup()
	}
}

type AuthMiddleware struct {
	handler gin.HandlerFunc
}

func (a AuthMiddleware) Handler() gin.HandlerFunc {
	return a.handler
}

func NewAuthMiddleware(
	env lib.Env,
	sessionAuth SessionAuthMiddleware,
	headerAuth HeaderAuthMiddleware,
	noAuth NoAuthMiddleware,
) AuthMiddleware {
	switch env.AuthMode {
	case "header":
		return AuthMiddleware{handler: headerAuth.Handler()}
	case "none":
		return AuthMiddleware{handler: noAuth.Handler()}
	default:
		return AuthMiddleware{handler: sessionAuth.Handler()}
	}
}
