package lib

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/viper"
)

type Env struct {
	ServerPort    string `mapstructure:"SERVER_PORT"`
	Environment   string `mapstructure:"ENV"`
	LogOutput     string `mapstructure:"LOG_OUTPUT"`
	DBUsername    string `mapstructure:"DB_USER"`
	DBPassword    string `mapstructure:"DB_PASS"`
	DBHost        string `mapstructure:"DB_HOST"`
	DBPort        string `mapstructure:"DB_PORT"`
	DBName        string `mapstructure:"DB_NAME"`
	SessionSecret string `mapstructure:"SESSION_SECRET"`
	CORSOrigin    string `mapstructure:"CORS_ORIGIN"`
}

func NewEnv() Env {
	env := Env{}
	
	viper.SetEnvPrefix("")
	viper.AutomaticEnv()
	
	configPath := os.Getenv("CONFIG_PATH")
	if configPath == "" {
		wd, _ := os.Getwd()
		possiblePaths := []string{
			filepath.Join(wd, "config", "config.yaml"),
			filepath.Join(wd, "..", "config", "config.yaml"),
			filepath.Join(wd, "..", "..", "config", "config.yaml"),
		}
		for _, path := range possiblePaths {
			if _, err := os.Stat(path); err == nil {
				configPath = path
				break
			}
		}
	}
	
	if configPath != "" {
		if _, err := os.Stat(configPath); err == nil {
			viper.SetConfigType("yaml")
			viper.SetConfigFile(configPath)
			viper.ReadInConfig()
		}
	}
	
	env.ServerPort = getEnvOrDefault("PORT", getEnvOrDefault("SERVER_PORT", 
		getConfigValue("server.port", viper.GetString("SERVER_PORT"), "3001")))
	
	env.Environment = getEnvOrDefault("NODE_ENV", getEnvOrDefault("ENV", 
		viper.GetString("ENV")))
	env.LogOutput = getEnvOrDefault("LOG_OUTPUT", viper.GetString("LOG_OUTPUT"))
	
	env.DBUsername = getEnvOrDefault("DB_USER", getEnvOrDefault("DB_USERNAME", 
		getConfigValue("database.username", viper.GetString("DB_USER"), "postgres")))
	env.DBPassword = getEnvOrDefault("DB_PASS", getEnvOrDefault("DB_PASSWORD", 
		getConfigValue("database.password", viper.GetString("DB_PASS"), "postgres")))
	env.DBHost = getEnvOrDefault("DB_HOST", 
		getConfigValue("database.host", viper.GetString("DB_HOST"), "localhost"))
	env.DBPort = getEnvOrDefault("DB_PORT", 
		getConfigValue("database.port", viper.GetString("DB_PORT"), "5432"))
	env.DBName = getEnvOrDefault("DB_NAME", getEnvOrDefault("DB_DATABASE", 
		getConfigValue("database.database", viper.GetString("DB_NAME"), "crossview")))
	
	env.SessionSecret = getEnvOrDefault("SESSION_SECRET", 
		getConfigValue("server.session.secret", viper.GetString("SESSION_SECRET"), 
			"crossview-secret-key-change-in-production"))
	
	env.CORSOrigin = getEnvOrDefault("CORS_ORIGIN", 
		getConfigValue("server.cors.origin", viper.GetString("CORS_ORIGIN"), 
			"http://localhost:5173"))
	
	return env
}

func getConfigValue(key, envValue, defaultValue string) string {
	if envValue != "" {
		return envValue
	}
	if viper.IsSet(key) {
		val := viper.Get(key)
		if val != nil {
			switch v := val.(type) {
			case string:
				return v
			case int, int32, int64:
				return fmt.Sprintf("%d", v)
			case float64:
				return fmt.Sprintf("%.0f", v)
			default:
				return viper.GetString(key)
			}
		}
	}
	return defaultValue
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	if defaultValue != "" {
		return defaultValue
	}
	return ""
}
