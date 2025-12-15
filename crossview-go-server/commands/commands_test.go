package commands

import (
	"testing"

	"go.uber.org/fx"
)

func TestGetSubCommands(t *testing.T) {
	subCommands := GetSubCommands(fx.Options())

	if len(subCommands) == 0 {
		t.Error("Expected at least one sub command")
	}

	found := false
	for _, cmd := range subCommands {
		if cmd.Use == "app:serve" {
			found = true
			break
		}
	}

	if !found {
		t.Error("Expected to find 'app:serve' command")
	}
}

func TestWrapSubCommand(t *testing.T) {
	cmd := NewServeCommand()
	wrappedCmd := WrapSubCommand("test:command", cmd, fx.Options())

	if wrappedCmd.Use != "test:command" {
		t.Errorf("Expected Use to be 'test:command', got '%s'", wrappedCmd.Use)
	}

	if wrappedCmd.Short == "" {
		t.Error("Expected Short description to be set")
	}
}

