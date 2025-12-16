package routes

import "go.uber.org/fx"

var Module = fx.Options(
	fx.Provide(NewHealthRoutes),
	fx.Provide(NewAuthRoutes),
	fx.Provide(NewSSORoutes),
	fx.Provide(NewKubernetesRoutes),
	fx.Provide(NewConfigRoutes),
	fx.Provide(NewUserRoutes),
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
	configRoutes ConfigRoutes,
	userRoutes UserRoutes,
	frontendRoutes FrontendRoutes,
) Routes {
	return Routes{
		healthRoutes,
		authRoutes,
		ssoRoutes,
		kubernetesRoutes,
		configRoutes,
		userRoutes,
		frontendRoutes,
	}
}

func (r Routes) Setup() {
	for _, route := range r {
		route.Setup()
	}
}
