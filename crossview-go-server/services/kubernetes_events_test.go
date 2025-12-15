package services

import (
	"testing"
)

func TestKubernetesService_GetEvents_EmptyNamespace(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()
	service := NewKubernetesService(logger, env)

	events, err := service.GetEvents("Pod", "test-pod", "", "")

	if err != nil {
		t.Errorf("Expected no error for empty namespace, got '%s'", err.Error())
	}

	if len(events) != 0 {
		t.Errorf("Expected empty events array, got %d events", len(events))
	}
}

func TestKubernetesService_GetEvents_UndefinedNamespace(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()
	service := NewKubernetesService(logger, env)

	events, err := service.GetEvents("Pod", "test-pod", "undefined", "")

	if err != nil {
		t.Errorf("Expected no error for undefined namespace, got '%s'", err.Error())
	}

	if len(events) != 0 {
		t.Errorf("Expected empty events array, got %d events", len(events))
	}
}

func TestKubernetesService_GetEvents_NullNamespace(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()
	service := NewKubernetesService(logger, env)

	events, err := service.GetEvents("Pod", "test-pod", "null", "")

	if err != nil {
		t.Errorf("Expected no error for null namespace, got '%s'", err.Error())
	}

	if len(events) != 0 {
		t.Errorf("Expected empty events array, got %d events", len(events))
	}
}

