package services

import (
	"testing"
)

func TestKubernetesService_GetCurrentContext_NotInitialized(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()

	service := NewKubernetesService(logger, env)
	context := service.GetCurrentContext()

	if context != "" {
		t.Errorf("Expected empty context for uninitialized service, got '%s'", context)
	}
}

func TestKubernetesService_GetClientset_NotInitialized(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()

	service := NewKubernetesService(logger, env)
	_, err := service.GetClientset()

	if err == nil {
		t.Error("Expected error when clientset is not initialized")
	}

	expectedError := "kubernetes client not initialized, call SetContext first"
	if err.Error() != expectedError {
		t.Errorf("Expected '%s', got '%s'", expectedError, err.Error())
	}
}

func TestKubernetesService_GetConfig_NotInitialized(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()

	service := NewKubernetesService(logger, env)
	_, err := service.GetConfig()

	if err == nil {
		t.Error("Expected error when config is not initialized")
	}

	expectedError := "kubernetes config not initialized, call SetContext first"
	if err.Error() != expectedError {
		t.Errorf("Expected '%s', got '%s'", expectedError, err.Error())
	}
}

func TestFileExists(t *testing.T) {
	if !fileExists("kubernetes_service.go") {
		t.Error("Expected fileExists to return true for existing file")
	}

	if fileExists("non_existent_file_12345.go") {
		t.Error("Expected fileExists to return false for non-existent file")
	}
}

