package main

import (
	"os"
	"path/filepath"
	"testing"
)

func setupTestApp(t *testing.T) *App {
	tempDir := t.TempDir()
	os.Setenv("HOME", tempDir)
	os.Setenv("USERPROFILE", tempDir)
	
	app := &App{
		environmentStorage: &EnvironmentStorage{
			filePath: filepath.Join(tempDir, ".postgo", "environments.json"),
			data: EnvironmentData{
				Environments:        []Environment{},
				ActiveEnvironmentID: "",
			},
		},
	}
	
	return app
}

func TestNewScriptRunner(t *testing.T) {
	app := setupTestApp(t)
	runner := NewScriptRunner(app)
	
	if runner == nil {
		t.Fatal("NewScriptRunner returned nil")
	}
	if runner.app == nil {
		t.Fatal("ScriptRunner.app is nil")
	}
}

func TestRunPreRequestScript_ConsoleLog(t *testing.T) {
	app := setupTestApp(t)
	runner := NewScriptRunner(app)
	
	req := &HttpRequest{
		ID:     "test-1",
		Method: GET,
		URL:    "https://api.example.com",
		Scripts: &Scripts{
			PreRequest: `console.log("Hello", "World");`,
		},
	}
	
	result, err := runner.RunPreRequestScript(req)
	if err != nil {
		t.Fatalf("RunPreRequestScript() error = %v", err)
	}
	
	if result == nil {
		t.Fatal("RunPreRequestScript() result is nil")
	}
	
	if len(result.ConsoleOutput) != 1 {
		t.Errorf("Expected 1 console output, got %d", len(result.ConsoleOutput))
	}
	
	if result.ConsoleOutput[0] != "Hello World" {
		t.Errorf("Expected console output 'Hello World', got '%s'", result.ConsoleOutput[0])
	}
}

func TestRunPreRequestScript_SetEnvironmentVariable(t *testing.T) {
	app := setupTestApp(t)
	
	env := Environment{
		ID:        "test-env",
		Name:      "Test",
		Variables: map[string]string{},
	}
	app.environmentStorage.SaveEnvironment(env)
	app.SetActiveEnvironment("test-env")
	
	runner := NewScriptRunner(app)
	
	req := &HttpRequest{
		ID:     "test-1",
		Method: GET,
		URL:    "https://api.example.com",
		Scripts: &Scripts{
			PreRequest: `pm.environment.set("testKey", "testValue");`,
		},
	}
	
	_, err := runner.RunPreRequestScript(req)
	if err != nil {
		t.Fatalf("RunPreRequestScript() error = %v", err)
	}
	
	updatedEnv := app.environmentStorage.GetEnvironment("test-env")
	if updatedEnv == nil {
		t.Fatal("Environment not found")
	}
	
	value, ok := updatedEnv.Variables["testKey"]
	if !ok {
		t.Error("testKey not found in environment variables")
	}
	if value != "testValue" {
		t.Errorf("Expected testValue, got %s", value)
	}
}

func TestRunPostRequestScript_StatusAssertion(t *testing.T) {
	app := setupTestApp(t)
	runner := NewScriptRunner(app)
	
	req := &HttpRequest{
		ID:     "test-1",
		Method: GET,
		URL:    "https://api.example.com",
		Scripts: &Scripts{
			PostRequest: `
				pm.test("Status is 200", function() {
					if (pm.response.code === 200) {
						return;
					}
					throw new Error("Status is not 200, got " + pm.response.code);
				});
			`,
		},
	}
	
	resp := &HttpResponse{
		Status:     200,
		StatusText: "OK",
		Body:       `{"message":"success"}`,
	}
	
	result, err := runner.RunPostRequestScript(req, resp)
	if err != nil {
		t.Fatalf("RunPostRequestScript() error = %v", err)
	}
	
	if len(result.Tests) != 1 {
		t.Fatalf("Expected 1 test result, got %d", len(result.Tests))
	}
	
	if !result.Tests[0].Passed {
		t.Errorf("Expected test to pass, but it failed: %s", result.Tests[0].Error)
	}
	
	if result.Tests[0].Name != "Status is 200" {
		t.Errorf("Expected test name 'Status is 200', got '%s'", result.Tests[0].Name)
	}
}

func TestRunPostRequestScript_FailedAssertion(t *testing.T) {
	app := setupTestApp(t)
	runner := NewScriptRunner(app)
	
	req := &HttpRequest{
		ID:     "test-1",
		Method: GET,
		URL:    "https://api.example.com",
		Scripts: &Scripts{
			PostRequest: `
				pm.test("Status is 200", function() {
					expect(pm.response).to.have.status(200);
				});
			`,
		},
	}
	
	resp := &HttpResponse{
		Status:     404,
		StatusText: "Not Found",
		Body:       `{"error":"not found"}`,
	}
	
	result, err := runner.RunPostRequestScript(req, resp)
	if err != nil {
		t.Fatalf("RunPostRequestScript() error = %v", err)
	}
	
	if len(result.Tests) != 1 {
		t.Fatalf("Expected 1 test result, got %d", len(result.Tests))
	}
	
	if result.Tests[0].Passed {
		t.Error("Expected test to fail, but it passed")
	}
}

func TestRunPostRequestScript_JSONParsing(t *testing.T) {
	app := setupTestApp(t)
	runner := NewScriptRunner(app)
	
	req := &HttpRequest{
		ID:     "test-1",
		Method: GET,
		URL:    "https://api.example.com",
		Scripts: &Scripts{
			PostRequest: `
				const data = pm.response.json();
				console.log("Message:", data.message);
			`,
		},
	}
	
	resp := &HttpResponse{
		Status:     200,
		StatusText: "OK",
		Body:       `{"message":"test"}`,
	}
	
	result, err := runner.RunPostRequestScript(req, resp)
	if err != nil {
		t.Fatalf("RunPostRequestScript() error = %v", err)
	}
	
	if len(result.ConsoleOutput) != 1 {
		t.Fatalf("Expected 1 console output, got %d", len(result.ConsoleOutput))
	}
	
	if result.ConsoleOutput[0] != "Message: test" {
		t.Errorf("Expected 'Message: test', got '%s'", result.ConsoleOutput[0])
	}
}

func TestRunPostRequestScript_SaveTokenToEnvironment(t *testing.T) {
	app := setupTestApp(t)
	
	env := Environment{
		ID:        "test-env",
		Name:      "Test",
		Variables: map[string]string{},
	}
	app.environmentStorage.SaveEnvironment(env)
	app.SetActiveEnvironment("test-env")
	
	runner := NewScriptRunner(app)
	
	req := &HttpRequest{
		ID:     "test-1",
		Method: POST,
		URL:    "https://api.example.com/auth",
		Scripts: &Scripts{
			PostRequest: `
				const data = pm.response.json();
				pm.environment.set("authToken", data.token);
				console.log("Token saved:", data.token);
			`,
		},
	}
	
	resp := &HttpResponse{
		Status:     200,
		StatusText: "OK",
		Body:       `{"token":"abc123"}`,
	}
	
	result, err := runner.RunPostRequestScript(req, resp)
	if err != nil {
		t.Fatalf("RunPostRequestScript() error = %v", err)
	}
	
	updatedEnv := app.environmentStorage.GetEnvironment("test-env")
	if updatedEnv == nil {
		t.Fatal("Environment not found")
	}
	
	token, ok := updatedEnv.Variables["authToken"]
	if !ok {
		t.Error("authToken not found in environment variables")
	}
	if token != "abc123" {
		t.Errorf("Expected token 'abc123', got '%s'", token)
	}
	
	if len(result.ConsoleOutput) < 1 {
		t.Errorf("Expected at least 1 console output, got %d", len(result.ConsoleOutput))
	}
}

func TestRunPreRequestScript_EmptyScript(t *testing.T) {
	app := setupTestApp(t)
	runner := NewScriptRunner(app)
	
	req := &HttpRequest{
		ID:     "test-1",
		Method: GET,
		URL:    "https://api.example.com",
		Scripts: &Scripts{
			PreRequest: "",
		},
	}
	
	result, err := runner.RunPreRequestScript(req)
	if err != nil {
		t.Fatalf("RunPreRequestScript() error = %v", err)
	}
	
	if result != nil {
		t.Error("Expected nil result for empty script")
	}
}

func TestRunPreRequestScript_SyntaxError(t *testing.T) {
	app := setupTestApp(t)
	runner := NewScriptRunner(app)
	
	req := &HttpRequest{
		ID:     "test-1",
		Method: GET,
		URL:    "https://api.example.com",
		Scripts: &Scripts{
			PreRequest: `console.log("unclosed string`,
		},
	}
	
	result, err := runner.RunPreRequestScript(req)
	if err == nil {
		t.Error("Expected error for syntax error in script")
	}
	
	if result == nil {
		t.Error("Expected result with error message")
	}
	
	if result != nil && result.Error == "" {
		t.Error("Expected error message in result")
	}
}
