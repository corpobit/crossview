package controllers


import (
	"crossview-go-server/api/controllers/auth"
	"crossview-go-server/api/controllers/kubernetes"
	"crossview-go-server/api/controllers/sso"
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(auth.NewAuthController),
	fx.Provide(sso.NewSSOController),
	fx.Provide(kubernetes.NewKubernetesController),
)
