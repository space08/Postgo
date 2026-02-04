package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNewEnvironmentStorage(t *testing.T) {
	tempDir := t.TempDir()
	os.Setenv("HOME", tempDir)
	os.Setenv("USERPROFILE", tempDir)
	
	storage, err := NewEnvironmentStorage()
	if err != nil {
		t.Fatalf("NewEnvironmentStorage() error = %v", err)
	}
	
	if storage == nil {
		t.Fatal("NewEnvironmentStorage() returned nil")
	}
	
	if storage.filePath == "" {
		t.Error("filePath is empty")
	}
}

func TestSaveAndGetEnvironment(t *testing.T) {
	tempDir := t.TempDir()
	os.Setenv("HOME", tempDir)
	os.Setenv("USERPROFILE", tempDir)
	
	storage, err := NewEnvironmentStorage()
	if err != nil {
		t.Fatalf("NewEnvironmentStorage() error = %v", err)
	}
	
	env := Environment{
		ID:   "env-1",
		Name: "Development",
		Variables: map[string]string{
			"baseUrl": "https://dev.api.example.com",
			"apiKey":  "dev-key-123",
		},
	}
	
	err = storage.SaveEnvironment(env)
	if err != nil {
		t.Fatalf("SaveEnvironment() error = %v", err)
	}
	
	retrieved := storage.GetEnvironment("env-1")
	if retrieved == nil {
		t.Fatal("GetEnvironment() returned nil")
	}
	
	if retrieved.ID != env.ID {
		t.Errorf("Expected ID %s, got %s", env.ID, retrieved.ID)
	}
	if retrieved.Name != env.Name {
		t.Errorf("Expected Name %s, got %s", env.Name, retrieved.Name)
	}
	if retrieved.Variables["baseUrl"] != env.Variables["baseUrl"] {
		t.Errorf("Expected baseUrl %s, got %s", env.Variables["baseUrl"], retrieved.Variables["baseUrl"])
	}
}

func TestUpdateEnvironment(t *testing.T) {
	tempDir := t.TempDir()
	os.Setenv("HOME", tempDir)
	os.Setenv("USERPROFILE", tempDir)
	
	storage, err := NewEnvironmentStorage()
	if err != nil {
		t.Fatalf("NewEnvironmentStorage() error = %v", err)
	}
	
	env := Environment{
		ID:   "env-1",
		Name: "Development",
		Variables: map[string]string{
			"baseUrl": "https://dev.api.example.com",
		},
	}
	
	err = storage.SaveEnvironment(env)
	if err != nil {
		t.Fatalf("SaveEnvironment() error = %v", err)
	}
	
	env.Variables["baseUrl"] = "https://dev2.api.example.com"
	env.Variables["newKey"] = "newValue"
	
	err = storage.SaveEnvironment(env)
	if err != nil {
		t.Fatalf("SaveEnvironment() (update) error = %v", err)
	}
	
	retrieved := storage.GetEnvironment("env-1")
	if retrieved == nil {
		t.Fatal("GetEnvironment() returned nil")
	}
	
	if retrieved.Variables["baseUrl"] != "https://dev2.api.example.com" {
		t.Errorf("Expected updated baseUrl, got %s", retrieved.Variables["baseUrl"])
	}
	
	if retrieved.Variables["newKey"] != "newValue" {
		t.Errorf("Expected newKey to be 'newValue', got %s", retrieved.Variables["newKey"])
	}
	
	allEnvs := storage.GetAllEnvironments()
	if len(allEnvs) != 1 {
		t.Errorf("Expected 1 environment, got %d", len(allEnvs))
	}
}

func TestDeleteEnvironment(t *testing.T) {
	tempDir := t.TempDir()
	os.Setenv("HOME", tempDir)
	os.Setenv("USERPROFILE", tempDir)
	
	storage, err := NewEnvironmentStorage()
	if err != nil {
		t.Fatalf("NewEnvironmentStorage() error = %v", err)
	}
	
	env1 := Environment{ID: "env-1", Name: "Dev", Variables: map[string]string{}}
	env2 := Environment{ID: "env-2", Name: "Prod", Variables: map[string]string{}}
	
	storage.SaveEnvironment(env1)
	storage.SaveEnvironment(env2)
	
	err = storage.DeleteEnvironment("env-1")
	if err != nil {
		t.Fatalf("DeleteEnvironment() error = %v", err)
	}
	
	retrieved := storage.GetEnvironment("env-1")
	if retrieved != nil {
		t.Error("Expected env-1 to be deleted, but it still exists")
	}
	
	allEnvs := storage.GetAllEnvironments()
	if len(allEnvs) != 1 {
		t.Errorf("Expected 1 environment, got %d", len(allEnvs))
	}
	
	if allEnvs[0].ID != "env-2" {
		t.Errorf("Expected remaining environment to be env-2, got %s", allEnvs[0].ID)
	}
}

func TestActiveEnvironment(t *testing.T) {
	tempDir := t.TempDir()
	os.Setenv("HOME", tempDir)
	os.Setenv("USERPROFILE", tempDir)
	
	storage, err := NewEnvironmentStorage()
	if err != nil {
		t.Fatalf("NewEnvironmentStorage() error = %v", err)
	}
	
	activeID := storage.GetActiveEnvironmentID()
	if activeID != "" {
		t.Errorf("Expected empty active environment, got %s", activeID)
	}
	
	err = storage.SetActiveEnvironmentID("env-1")
	if err != nil {
		t.Fatalf("SetActiveEnvironmentID() error = %v", err)
	}
	
	activeID = storage.GetActiveEnvironmentID()
	if activeID != "env-1" {
		t.Errorf("Expected active environment 'env-1', got %s", activeID)
	}
}

func TestDeleteActiveEnvironment(t *testing.T) {
	tempDir := t.TempDir()
	os.Setenv("HOME", tempDir)
	os.Setenv("USERPROFILE", tempDir)
	
	storage, err := NewEnvironmentStorage()
	if err != nil {
		t.Fatalf("NewEnvironmentStorage() error = %v", err)
	}
	
	env := Environment{ID: "env-1", Name: "Dev", Variables: map[string]string{}}
	storage.SaveEnvironment(env)
	storage.SetActiveEnvironmentID("env-1")
	
	activeID := storage.GetActiveEnvironmentID()
	if activeID != "env-1" {
		t.Errorf("Expected active environment 'env-1', got %s", activeID)
	}
	
	err = storage.DeleteEnvironment("env-1")
	if err != nil {
		t.Fatalf("DeleteEnvironment() error = %v", err)
	}
	
	activeID = storage.GetActiveEnvironmentID()
	if activeID != "" {
		t.Errorf("Expected active environment to be cleared, got %s", activeID)
	}
}

func TestEnvironmentPersistence(t *testing.T) {
	tempDir := t.TempDir()
	os.Setenv("HOME", tempDir)
	os.Setenv("USERPROFILE", tempDir)
	
	storage1, err := NewEnvironmentStorage()
	if err != nil {
		t.Fatalf("NewEnvironmentStorage() error = %v", err)
	}
	
	env := Environment{
		ID:   "env-1",
		Name: "Test",
		Variables: map[string]string{
			"key": "value",
		},
	}
	
	err = storage1.SaveEnvironment(env)
	if err != nil {
		t.Fatalf("SaveEnvironment() error = %v", err)
	}
	
	err = storage1.SetActiveEnvironmentID("env-1")
	if err != nil {
		t.Fatalf("SetActiveEnvironmentID() error = %v", err)
	}
	
	storage2, err := NewEnvironmentStorage()
	if err != nil {
		t.Fatalf("NewEnvironmentStorage() (reload) error = %v", err)
	}
	
	retrieved := storage2.GetEnvironment("env-1")
	if retrieved == nil {
		t.Fatal("Environment not persisted")
	}
	
	if retrieved.Name != "Test" {
		t.Errorf("Expected Name 'Test', got %s", retrieved.Name)
	}
	
	activeID := storage2.GetActiveEnvironmentID()
	if activeID != "env-1" {
		t.Errorf("Expected active environment 'env-1', got %s", activeID)
	}
}

func TestGetAllEnvironments(t *testing.T) {
	tempDir := t.TempDir()
	os.Setenv("HOME", tempDir)
	os.Setenv("USERPROFILE", tempDir)
	
	storage, err := NewEnvironmentStorage()
	if err != nil {
		t.Fatalf("NewEnvironmentStorage() error = %v", err)
	}
	
	envs := []Environment{
		{ID: "env-1", Name: "Dev", Variables: map[string]string{"key1": "val1"}},
		{ID: "env-2", Name: "Prod", Variables: map[string]string{"key2": "val2"}},
		{ID: "env-3", Name: "Test", Variables: map[string]string{"key3": "val3"}},
	}
	
	for _, env := range envs {
		err = storage.SaveEnvironment(env)
		if err != nil {
			t.Fatalf("SaveEnvironment() error = %v", err)
		}
	}
	
	allEnvs := storage.GetAllEnvironments()
	if len(allEnvs) != 3 {
		t.Errorf("Expected 3 environments, got %d", len(allEnvs))
	}
}

func TestGetNonExistentEnvironment(t *testing.T) {
	tempDir := t.TempDir()
	os.Setenv("HOME", tempDir)
	os.Setenv("USERPROFILE", tempDir)
	
	storage, err := NewEnvironmentStorage()
	if err != nil {
		t.Fatalf("NewEnvironmentStorage() error = %v", err)
	}
	
	retrieved := storage.GetEnvironment("nonexistent")
	if retrieved != nil {
		t.Error("Expected nil for non-existent environment")
	}
}

func TestLoadLegacyFormat(t *testing.T) {
	tempDir := t.TempDir()
	dataDir := filepath.Join(tempDir, ".postgo")
	os.MkdirAll(dataDir, 0755)
	
	legacyJSON := `[
		{"id":"env-1","name":"Dev","variables":{"key":"value"}}
	]`
	
	filePath := filepath.Join(dataDir, "environments.json")
	err := os.WriteFile(filePath, []byte(legacyJSON), 0644)
	if err != nil {
		t.Fatalf("Failed to write legacy file: %v", err)
	}
	
	os.Setenv("HOME", tempDir)
	os.Setenv("USERPROFILE", tempDir)
	
	storage, err := NewEnvironmentStorage()
	if err != nil {
		t.Fatalf("NewEnvironmentStorage() error = %v", err)
	}
	
	env := storage.GetEnvironment("env-1")
	if env == nil {
		t.Fatal("Failed to load legacy environment")
	}
	
	if env.Name != "Dev" {
		t.Errorf("Expected name 'Dev', got %s", env.Name)
	}
}
