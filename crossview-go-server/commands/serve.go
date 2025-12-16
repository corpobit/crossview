package commands

import (
	"github.com/spf13/cobra"
	"crossview-go-server/api/middlewares"
	"crossview-go-server/api/routes"
	"crossview-go-server/lib"
	"crossview-go-server/models"
)

// ServeCommand test command
type ServeCommand struct{}

func (s *ServeCommand) Short() string {
	return "serve application"
}

func (s *ServeCommand) Setup(cmd *cobra.Command) {}

func (s *ServeCommand) Run() lib.CommandRunner {
	return func(
		middleware middlewares.Middlewares,
		env lib.Env,
		router lib.RequestHandler,
		route routes.Routes,
		logger lib.Logger,
		database lib.Database,
	) {
		// Run database migrations
		userRepo := models.NewUserRepository(database.DB)
		if err := userRepo.AutoMigrate(); err != nil {
			logger.Panicf("Failed to run database migrations: %v", err)
		}
		logger.Info("Database migrations completed")
		
		middleware.Setup()
		route.Setup()

		logger.Info("Running server")
		if env.ServerPort == "" {
			_ = router.Gin.Run()
		} else {
			_ = router.Gin.Run(":" + env.ServerPort)
		}
	}
}

func NewServeCommand() *ServeCommand {
	return &ServeCommand{}
}
