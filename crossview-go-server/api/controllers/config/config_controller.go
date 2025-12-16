package config

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"crossview-go-server/lib"
)

type ConfigController struct {
	logger lib.Logger
	env    lib.Env
}

func NewConfigController(logger lib.Logger, env lib.Env) ConfigController {
	return ConfigController{
		logger: logger,
		env:    env,
	}
}

func (c *ConfigController) GetDatabaseConfig(ctx *gin.Context) {
	port, _ := strconv.Atoi(c.env.DBPort)
	if port == 0 {
		port = 5432
	}
	
	ctx.JSON(http.StatusOK, gin.H{
		"host":     c.env.DBHost,
		"port":     port,
		"database": c.env.DBName,
		"username": c.env.DBUsername,
	})
}

