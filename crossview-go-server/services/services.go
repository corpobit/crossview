package services

import (
	"context"

	"crossview-go-server/lib"
	"crossview-go-server/models"
	"go.uber.org/fx"
)

type SSOServiceInterface interface {
	GetSSOStatus() lib.SSOConfig
	InitiateOIDC(ctx context.Context) (string, error)
	HandleOIDCCallback(ctx context.Context, code, state string) (*models.User, error)
	InitiateSAML(ctx context.Context) (string, error)
	HandleSAMLCallback(ctx context.Context, samlResponse string) (*models.User, error)
}

// Module exports services present
var Module = fx.Options(
	fx.Provide(NewSSOService),
	fx.Provide(NewKubernetesService),
)
