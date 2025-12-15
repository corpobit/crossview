package routes

import "go.uber.org/fx"

var Module = fx.Options(
	fx.Provide(NewAuthRoutes),
	fx.Provide(NewSSORoutes),
	fx.Provide(NewKubernetesRoutes),
	fx.Provide(NewFrontendRoutes),
	fx.Provide(NewRoutes),
)

type Routes []Route

type Route interface {
	Setup()
}

func NewRoutes(
	authRoutes AuthRoutes,
	ssoRoutes SSORoutes,
	kubernetesRoutes KubernetesRoutes,
	frontendRoutes FrontendRoutes,
) Routes {
	return Routes{
		authRoutes,
		ssoRoutes,
		kubernetesRoutes,
		frontendRoutes,
	}
}

func (r Routes) Setup() {
	for _, route := range r {
		route.Setup()
	}
}
