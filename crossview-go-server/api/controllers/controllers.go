package controllers


import (
	"crossview-go-server/api/controllers/auth"
	"crossview-go-server/api/controllers/config"
	"crossview-go-server/api/controllers/kubernetes"
	"crossview-go-server/api/controllers/sso"
	"crossview-go-server/api/controllers/user"
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(auth.NewAuthController),
	fx.Provide(sso.NewSSOController),
	fx.Provide(kubernetes.NewKubernetesController),
	fx.Provide(kubernetes.NewWatchController),
	fx.Provide(config.NewConfigController),
	fx.Provide(user.NewUserController),
)
