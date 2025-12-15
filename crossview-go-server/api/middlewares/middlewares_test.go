package middlewares

import (
	"testing"
)

type MockMiddleware struct {
	setupCalled bool
}

func (m *MockMiddleware) Setup() {
	m.setupCalled = true
}

func TestMiddlewares_Setup(t *testing.T) {
	mockMiddleware1 := &MockMiddleware{}
	mockMiddleware2 := &MockMiddleware{}

	middlewares := Middlewares{
		mockMiddleware1,
		mockMiddleware2,
	}

	middlewares.Setup()

	if !mockMiddleware1.setupCalled {
		t.Error("Expected Setup() to be called on first middleware")
	}

	if !mockMiddleware2.setupCalled {
		t.Error("Expected Setup() to be called on second middleware")
	}
}

func TestMiddlewares_Empty(t *testing.T) {
	middlewares := Middlewares{}

	middlewares.Setup()

	if len(middlewares) != 0 {
		t.Errorf("Expected 0 middlewares, got %d", len(middlewares))
	}
}

