package routes

import (
	"crossview-go-server/api/controllers/sso"
	"crossview-go-server/lib"
)

type SSORoutes struct {
	logger     lib.Logger
	handler    lib.RequestHandler
	controller sso.SSOController
}

func NewSSORoutes(
	logger lib.Logger,
	handler lib.RequestHandler,
	controller sso.SSOController,
) SSORoutes {
	return SSORoutes{
		logger:     logger,
		handler:    handler,
		controller: controller,
	}
}

func (r SSORoutes) Setup() {
	r.logger.Info("Setting up SSO routes")
	api := r.handler.Gin.Group("/api")
	{
		api.GET("/auth/sso/status", r.controller.GetStatus)
		api.GET("/auth/oidc", r.controller.InitiateOIDC)
		api.GET("/auth/oidc/callback", r.controller.HandleOIDCCallback)
		api.GET("/auth/saml", r.controller.InitiateSAML)
		api.POST("/auth/saml/callback", r.controller.HandleSAMLCallback)
	}
}

