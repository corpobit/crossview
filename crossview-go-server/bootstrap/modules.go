package bootstrap

import (
	"crossview-go-server/api/controllers"
	"crossview-go-server/api/middlewares"
	"crossview-go-server/api/routes"
	"crossview-go-server/lib"
	"crossview-go-server/models"
	"crossview-go-server/services"

	"go.uber.org/fx"
)

var CommonModules = fx.Options(
	controllers.Module,
	routes.Module,
	lib.Module,
	fx.Provide(func(db lib.Database) *models.UserRepository {
		return models.NewUserRepository(db.DB)
	}),
	services.Module,
	middlewares.Module,
)
