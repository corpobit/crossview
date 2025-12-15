package routes

import (
	"crossview-go-server/api/controllers/auth"
	"crossview-go-server/lib"
)

type AuthRoutes struct {
	logger     lib.Logger
	handler    lib.RequestHandler
	controller auth.AuthController
}

func NewAuthRoutes(
	logger lib.Logger,
	handler lib.RequestHandler,
	controller auth.AuthController,
) AuthRoutes {
	return AuthRoutes{
		logger:     logger,
		handler:    handler,
		controller: controller,
	}
}

func (r AuthRoutes) Setup() {
	r.logger.Info("Setting up auth routes")
	api := r.handler.Gin.Group("/api")
	{
		api.GET("/auth/check", r.controller.Check)
		api.POST("/auth/login", r.controller.Login)
		api.POST("/auth/logout", r.controller.Logout)
		api.POST("/auth/register", r.controller.Register)
	}
}

