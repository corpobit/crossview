package bootstrap

import (
	"go.uber.org/fx"
	"crossview-go-server/api/controllers"
	"crossview-go-server/api/middlewares"
	"crossview-go-server/api/routes"
	"crossview-go-server/lib"
	"crossview-go-server/services"
)

var CommonModules = fx.Options(
	controllers.Module,
	routes.Module,
	lib.Module,
	services.Module,
	middlewares.Module,
)
