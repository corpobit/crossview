package routes

import (
	"net/http"
	"os"
	"path/filepath"
	"github.com/gin-gonic/gin"
	"crossview-go-server/lib"
)

type FrontendRoutes struct {
	logger  lib.Logger
	handler lib.RequestHandler
}

func NewFrontendRoutes(
	logger lib.Logger,
	handler lib.RequestHandler,
) FrontendRoutes {
	return FrontendRoutes{
		logger:  logger,
		handler: handler,
	}
}

func (r FrontendRoutes) Setup() {
	r.logger.Info("Setting up frontend routes")
	
	wd, _ := os.Getwd()
	distPath := filepath.Join(wd, "dist")
	
	if _, err := os.Stat(distPath); os.IsNotExist(err) {
		distPath = filepath.Join(wd, "..", "dist")
	}
	
	if _, err := os.Stat(distPath); os.IsNotExist(err) {
		r.logger.Warn("dist directory not found, frontend will not be served")
		return
	}
	
	r.logger.Info("Serving frontend from: " + distPath)
	
	r.handler.Gin.Static("/assets", filepath.Join(distPath, "assets"))
	r.handler.Gin.Static("/images", filepath.Join(distPath, "images"))
	r.handler.Gin.StaticFile("/favicon.ico", filepath.Join(distPath, "favicon.ico"))
	
	r.handler.Gin.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if len(path) >= 4 && path[:4] == "/api" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
			return
		}
		indexPath := filepath.Join(distPath, "index.html")
		if _, err := os.Stat(indexPath); err == nil {
			c.File(indexPath)
		} else {
			c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
		}
	})
}

