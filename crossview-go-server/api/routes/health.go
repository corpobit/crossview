package routes

import (
	"net/http"
	"crossview-go-server/lib"
	"github.com/gin-gonic/gin"
)

type HealthRoutes struct {
	logger  lib.Logger
	handler lib.RequestHandler
}

func NewHealthRoutes(
	logger lib.Logger,
	handler lib.RequestHandler,
) HealthRoutes {
	return HealthRoutes{
		logger:  logger,
		handler: handler,
	}
}

func (r HealthRoutes) Setup() {
	r.logger.Info("Setting up health routes")
	api := r.handler.Gin.Group("/api")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status": "ok",
			})
		})
	}
}

