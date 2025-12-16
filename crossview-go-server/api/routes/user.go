package routes

import (
	"crossview-go-server/api/controllers/user"
	"crossview-go-server/api/middlewares"
	"crossview-go-server/lib"
	"crossview-go-server/models"
)

type UserRoutes struct {
	logger     lib.Logger
	handler    lib.RequestHandler
	controller user.UserController
	userRepo   *models.UserRepository
}

func NewUserRoutes(
	logger lib.Logger,
	handler lib.RequestHandler,
	controller user.UserController,
	db lib.Database,
) UserRoutes {
	userRepo := models.NewUserRepository(db.DB)
	return UserRoutes{
		logger:     logger,
		handler:    handler,
		controller: controller,
		userRepo:   userRepo,
	}
}

func (r UserRoutes) Setup() {
	r.logger.Info("Setting up user routes")
	api := r.handler.Gin.Group("/api")
	{
		api.GET("/users", middlewares.RequireAdmin(r.userRepo), r.controller.GetUsers)
		api.POST("/users", middlewares.RequireAdmin(r.userRepo), r.controller.CreateUser)
		api.PUT("/users/:id", middlewares.RequireAdmin(r.userRepo), r.controller.UpdateUser)
	}
}

