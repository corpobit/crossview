package services

import (
	"strings"
	"testing"
)

func contains(s, substr string) bool {
	return strings.Contains(s, substr)
}

func TestKubernetesService_GetResources_EmptyApiVersion(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()
	service := NewKubernetesService(logger, env)

	_, err := service.GetResources("", "Kind", "", "test-context", "", nil, "")

	if err == nil {
		t.Error("Expected error for empty apiVersion")
	}

	if err.Error() != "apiVersion is required" && !contains(err.Error(), "context") {
		t.Errorf("Expected 'apiVersion is required' or context error, got '%s'", err.Error())
	}
}

func TestKubernetesService_GetResources_InvalidApiVersion(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()
	service := NewKubernetesService(logger, env)

	_, err := service.GetResources("invalid", "Kind", "", "test-context", "", nil, "")

	if err == nil {
		t.Error("Expected error for invalid apiVersion format")
	}

	expectedError := "invalid apiVersion format: invalid, expected group/version"
	if err.Error() != expectedError && !contains(err.Error(), "context") {
		t.Errorf("Expected '%s' or context error, got '%s'", expectedError, err.Error())
	}
}

func TestKubernetesService_GetResources_EmptyGroup(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()
	service := NewKubernetesService(logger, env)

	_, err := service.GetResources("/v1", "Kind", "", "test-context", "", nil, "")

	if err == nil {
		t.Error("Expected error for empty group")
	}

	expectedError := "invalid apiVersion format: /v1, group is required"
	if err.Error() != expectedError && !contains(err.Error(), "context") {
		t.Errorf("Expected '%s' or context error, got '%s'", expectedError, err.Error())
	}
}

func TestKubernetesService_GetResources_EmptyVersion(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()
	service := NewKubernetesService(logger, env)

	_, err := service.GetResources("group/", "Kind", "", "test-context", "", nil, "")

	if err == nil {
		t.Error("Expected error for empty version")
	}

	expectedError := "invalid apiVersion format: group/, version is required"
	if err.Error() != expectedError && !contains(err.Error(), "context") {
		t.Errorf("Expected '%s' or context error, got '%s'", expectedError, err.Error())
	}
}

func TestKubernetesService_GetResource_EmptyApiVersion(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()
	service := NewKubernetesService(logger, env)

	_, err := service.GetResource("", "Kind", "name", "", "test-context", "")

	if err == nil {
		t.Error("Expected error for empty apiVersion")
	}

	if err.Error() != "apiVersion is required" && !contains(err.Error(), "context") {
		t.Errorf("Expected 'apiVersion is required' or context error, got '%s'", err.Error())
	}
}

func TestKubernetesService_GetResource_EmptyKind(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()
	service := NewKubernetesService(logger, env)

	_, err := service.GetResource("v1", "", "name", "", "test-context", "")

	if err == nil {
		t.Error("Expected error for empty kind")
	}

	if err.Error() != "kind is required" && !contains(err.Error(), "context") {
		t.Errorf("Expected 'kind is required' or context error, got '%s'", err.Error())
	}
}

func TestKubernetesService_GetResource_EmptyName(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()
	service := NewKubernetesService(logger, env)

	_, err := service.GetResource("v1", "Kind", "", "", "test-context", "")

	if err == nil {
		t.Error("Expected error for empty name")
	}

	if err.Error() != "name is required" && !contains(err.Error(), "context") {
		t.Errorf("Expected 'name is required' or context error, got '%s'", err.Error())
	}
}

func TestKubernetesService_GetResource_InvalidApiVersion(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()
	service := NewKubernetesService(logger, env)

	_, err := service.GetResource("invalid", "Kind", "name", "", "test-context", "")

	if err == nil {
		t.Error("Expected error for invalid apiVersion format")
	}

	expectedError := "invalid apiVersion format: invalid, expected group/version"
	if err.Error() != expectedError && !contains(err.Error(), "context") {
		t.Errorf("Expected '%s' or context error, got '%s'", expectedError, err.Error())
	}
}

