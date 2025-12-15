package routes

import (
	"testing"
)

type MockRoute struct {
	setupCalled bool
}

func (m *MockRoute) Setup() {
	m.setupCalled = true
}

func TestRoutes_Setup(t *testing.T) {
	mockRoute1 := &MockRoute{}
	mockRoute2 := &MockRoute{}

	routes := Routes{
		mockRoute1,
		mockRoute2,
	}

	routes.Setup()

	if !mockRoute1.setupCalled {
		t.Error("Expected Setup() to be called on first route")
	}

	if !mockRoute2.setupCalled {
		t.Error("Expected Setup() to be called on second route")
	}
}

func TestRoutes_Empty(t *testing.T) {
	routes := Routes{}

	routes.Setup()

	if len(routes) != 0 {
		t.Errorf("Expected 0 routes, got %d", len(routes))
	}
}

