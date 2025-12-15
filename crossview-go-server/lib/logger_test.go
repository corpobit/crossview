package lib

import (
	"testing"
)

func TestGetLogger(t *testing.T) {
	logger := GetLogger()

	if logger.SugaredLogger == nil {
		t.Error("Expected SugaredLogger to be initialized")
	}
}

func TestLogger_GetGinLogger(t *testing.T) {
	logger := GetLogger()
	ginLogger := logger.GetGinLogger()

	if ginLogger.Logger == nil {
		t.Error("Expected GinLogger.Logger to be initialized")
	}
}

func TestLogger_GetFxLogger(t *testing.T) {
	logger := GetLogger()
	fxLogger := logger.GetFxLogger()

	if fxLogger == nil {
		t.Error("Expected FxLogger to be returned")
	}
}

func TestLogger_GetGormLogger(t *testing.T) {
	logger := GetLogger()
	gormLogger := logger.GetGormLogger()

	if gormLogger.Logger == nil {
		t.Error("Expected GormLogger.Logger to be initialized")
	}
}

func TestGinLogger_Write(t *testing.T) {
	logger := GetLogger()
	ginLogger := logger.GetGinLogger()

	data := []byte("test message")
	n, err := ginLogger.Write(data)

	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if n != len(data) {
		t.Errorf("Expected to write %d bytes, got %d", len(data), n)
	}
}

