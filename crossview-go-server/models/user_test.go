package models

import (
	"testing"
)

func TestUser_SetPassword(t *testing.T) {
	user := &User{}
	password := "test-password-123"

	err := user.SetPassword(password)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if user.PasswordHash == "" {
		t.Error("Expected PasswordHash to be set")
	}

	if user.PasswordHash == password {
		t.Error("Expected PasswordHash to be hashed, not plain text")
	}
}

func TestUser_VerifyPassword(t *testing.T) {
	user := &User{}
	password := "test-password-123"

	err := user.SetPassword(password)
	if err != nil {
		t.Fatalf("Failed to set password: %v", err)
	}

	if !user.VerifyPassword(password) {
		t.Error("Expected VerifyPassword to return true for correct password")
	}

	if user.VerifyPassword("wrong-password") {
		t.Error("Expected VerifyPassword to return false for incorrect password")
	}
}

func TestUser_TableName(t *testing.T) {
	user := User{}
	tableName := user.TableName()

	if tableName != "users" {
		t.Errorf("Expected table name to be 'users', got '%s'", tableName)
	}
}

func TestStringPtr(t *testing.T) {
	result := stringPtr("test")
	if result == nil {
		t.Error("Expected non-nil pointer for non-empty string")
	}
	if *result != "test" {
		t.Errorf("Expected 'test', got '%s'", *result)
	}

	result = stringPtr("")
	if result != nil {
		t.Error("Expected nil pointer for empty string")
	}
}

func TestGenerateRandomPassword(t *testing.T) {
	password1 := generateRandomPassword()
	password2 := generateRandomPassword()

	if len(password1) != 32 {
		t.Errorf("Expected password length to be 32, got %d", len(password1))
	}

	if password1 == password2 {
		t.Error("Expected generated passwords to be different")
	}
}

