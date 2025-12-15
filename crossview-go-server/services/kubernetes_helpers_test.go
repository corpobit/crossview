package services

import (
	"testing"
)

func TestKubernetesService_objectToMap_WithMap(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()
	service := NewKubernetesService(logger, env).(*KubernetesService)

	input := map[string]interface{}{
		"key1": "value1",
		"key2": 123,
	}

	result := service.objectToMap(input)

	if result["key1"] != "value1" {
		t.Errorf("Expected 'value1', got '%v'", result["key1"])
	}

	if result["key2"] != 123 {
		t.Errorf("Expected 123, got '%v'", result["key2"])
	}
}

func TestKubernetesService_objectToMap_WithNil(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()
	service := NewKubernetesService(logger, env).(*KubernetesService)

	result := service.objectToMap(nil)

	if result == nil {
		t.Error("Expected non-nil result for nil input")
	}

	if len(result) != 0 {
		t.Errorf("Expected empty map, got map with %d keys", len(result))
	}
}

func TestKubernetesService_resolvePluralName_InvalidApiVersion(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()
	service := NewKubernetesService(logger, env).(*KubernetesService)

	_, err := service.resolvePluralName("invalid", "Kind", "")

	if err == nil {
		t.Error("Expected error for invalid apiVersion format")
	}
}

func TestKubernetesService_resolvePluralName_EmptyApiVersion(t *testing.T) {
	logger := setupTestLogger()
	env := setupTestEnv()
	service := NewKubernetesService(logger, env).(*KubernetesService)

	_, err := service.resolvePluralName("", "Kind", "")

	if err == nil {
		t.Error("Expected error for empty apiVersion")
	}
}

