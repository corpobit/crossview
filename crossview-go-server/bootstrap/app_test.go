package bootstrap

import (
	"testing"
)

func TestNewApp(t *testing.T) {
	app := NewApp()

	if app.Command == nil {
		t.Error("Expected Command to be initialized")
	}

	if app.Command.Use != "clean-gin" {
		t.Errorf("Expected Use to be 'clean-gin', got '%s'", app.Command.Use)
	}
}

func TestRootApp(t *testing.T) {
	if RootApp.Command == nil {
		t.Error("Expected RootApp.Command to be initialized")
	}
}

