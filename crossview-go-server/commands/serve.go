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
		logger.Info("Starting server initialization...")
		
		sqlDB, err := database.DB.DB()
		if err != nil {
			logger.Errorf("Failed to get underlying SQL DB: %v", err)
			logger.Panicf("Failed to get underlying SQL DB: %v", err)
		}
		
		logger.Info("Pinging database...")
		if err := sqlDB.Ping(); err != nil {
			logger.Errorf("Failed to ping database: %v", err)
			logger.Panicf("Failed to ping database: %v", err)
		}
		logger.Info("Database ping successful")
		
		logger.Info("Running database migrations...")
		
		userRepo := models.NewUserRepository(database.DB)
		if err := userRepo.AutoMigrate(); err != nil {
			logger.Errorf("Migration error details: %+v", err)
			logger.Errorf("Migration error type: %T", err)
			logger.Errorf("Migration error string: %s", err.Error())
			logger.Errorf("Migration error wrapped: %#v", err)
			
			sqlDB, pingErr := database.DB.DB()
			if pingErr == nil {
				if pingErr := sqlDB.Ping(); pingErr != nil {
					logger.Errorf("Database connection is broken after migration error: %v", pingErr)
				} else {
					logger.Info("Database connection is still valid after migration error")
				}
			}
			
			logger.Panicf("Failed to run database migrations: %v", err)
		}
		logger.Info("Database migrations completed successfully")
		
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
