package routes

import "go.uber.org/fx"

var Module = fx.Options(
	fx.Provide(NewHealthRoutes),
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
	healthRoutes HealthRoutes,
	authRoutes AuthRoutes,
	ssoRoutes SSORoutes,
	kubernetesRoutes KubernetesRoutes,
	frontendRoutes FrontendRoutes,
) Routes {
	return Routes{
		healthRoutes,
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
