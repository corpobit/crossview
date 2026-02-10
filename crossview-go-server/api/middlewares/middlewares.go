package middlewares

import "go.uber.org/fx"

var Module = fx.Options(
	fx.Provide(NewCorsMiddleware),
	fx.Provide(NewSessionMiddleware),
	fx.Provide(NewSessionAuthMiddleware),
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
