package services

import (
	"testing"
)

func TestKubernetesService_SetContext_EmptyContextWhenNotInCluster(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()
	service := NewKubernetesService(logger, env)

	err := service.SetContext("")

	if err == nil {
		t.Error("Expected error when setting empty context and not in cluster")
	}

	expectedError := "context parameter is required when not running in cluster"
	if err.Error() != expectedError {
		t.Errorf("Expected '%s', got '%s'", expectedError, err.Error())
	}
}

func TestKubernetesService_SetContext_NonExistentContext(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()
	service := NewKubernetesService(logger, env)

	err := service.SetContext("non-existent-context")

	if err == nil {
		t.Error("Expected error when setting non-existent context")
	}

	if err.Error() == "" {
		t.Error("Expected non-empty error message")
	}
}

func TestKubernetesService_IsConnected_EmptyContext(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()
	service := NewKubernetesService(logger, env)

	connected, err := service.IsConnected("")

	if err == nil {
		t.Error("Expected error when checking connection with empty context")
	}

	if connected {
		t.Error("Expected false for connection check with empty context")
	}
}

