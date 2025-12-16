package lib

import (
	"fmt"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Database struct {
	*gorm.DB
}

func NewDatabase(env Env, logger Logger) Database {
	username := env.DBUsername
	password := env.DBPassword
	host := env.DBHost
	port := env.DBPort
	dbname := env.DBName

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC", host, username, password, dbname, port)

	maxRetries := 10
	retryDelay := 2 * time.Second
	var db *gorm.DB
	var err error

	for i := 0; i < maxRetries; i++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.GetGormLogger(),
		})

		if err == nil {
			sqlDB, dbErr := db.DB()
			if dbErr == nil {
				if pingErr := sqlDB.Ping(); pingErr == nil {
					logger.Info("Database connection established")
					return Database{
						DB: db,
					}
				} else {
					if sqlDB != nil {
						sqlDB.Close()
					}
					err = pingErr
				}
			} else {
				if db != nil {
					sqlDB, _ := db.DB()
					if sqlDB != nil {
						sqlDB.Close()
					}
				}
				err = dbErr
			}
		}

		if i < maxRetries-1 {
			logger.Infof("Database connection attempt %d/%d failed: %v, retrying in %v...", i+1, maxRetries, err, retryDelay)
			time.Sleep(retryDelay)
			retryDelay = time.Duration(float64(retryDelay) * 1.5)
		}
	}

	logger.Info("DSN: ", dsn)
	logger.Panicf("Failed to connect to database after %d attempts: %v", maxRetries, err)

	return Database{
		DB: db,
	}
}
