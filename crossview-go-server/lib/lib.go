package lib

import (
	"context"
	"go.uber.org/fx"
)

// Module exports dependency
var Module = fx.Options(
	fx.Provide(NewRequestHandler),
	fx.Provide(NewEnv),
	fx.Provide(GetLogger),
	fx.Provide(NewDatabase),
	fx.Invoke(registerDatabaseLifecycle),
)

func registerDatabaseLifecycle(lc fx.Lifecycle, db Database, logger Logger) {
	lc.Append(fx.Hook{
		OnStop: func(ctx context.Context) error {
			logger.Info("Closing database connection...")
			return db.Close()
		},
	})
}
