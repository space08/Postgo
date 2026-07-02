package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func newRequestTestApp(t *testing.T) *App {
	t.Helper()

	tempDir := t.TempDir()
	dataDir := filepath.Join(tempDir, ".postgo")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		t.Fatalf("failed to create test data dir: %v", err)
	}

	return &App{
		httpClient: NewHttpClient(),
		historyStorage: &HistoryStorage{
			history:  []HistoryRecord{},
			filePath: filepath.Join(dataDir, "history.json"),
		},
		projectStorage: &ProjectStorage{
			projects: []Project{},
			filePath: filepath.Join(dataDir, "projects.json"),
		},
		requestStorage: &RequestStorage{
			requests: []HttpRequest{},
			filePath: filepath.Join(dataDir, "requests.json"),
		},
		environmentStorage: &EnvironmentStorage{
			data: EnvironmentData{
				Environments:        []Environment{},
				ActiveEnvironmentID: "",
			},
			filePath: filepath.Join(dataDir, "environments.json"),
		},
	}
}

func TestSendRequestResolvesProjectBaseURLAndAddsProtocol(t *testing.T) {
	var gotPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`ok`))
	}))
	defer server.Close()

	app := newRequestTestApp(t)
	app.projectStorage.projects = []Project{
		{
			ID:      "proj-1",
			Name:    "Test",
			BaseUrl: strings.TrimPrefix(server.URL, "http://"),
		},
	}

	resp, err := app.SendRequest(HttpRequest{
		Method:    GET,
		URL:       "/ping",
		ProjectId: "proj-1",
	})
	if err != nil {
		t.Fatalf("SendRequest() error = %v", err)
	}
	if resp.Status != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.Status)
	}
	if gotPath != "/ping" {
		t.Fatalf("expected path /ping, got %s", gotPath)
	}
}

func TestSendRequestReplacesFormDataVariables(t *testing.T) {
	var gotBody string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		gotBody = string(body)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	app := newRequestTestApp(t)
	app.environmentStorage.data = EnvironmentData{
		Environments: []Environment{
			{
				ID:   "env-1",
				Name: "Test",
				Variables: map[string]string{
					"token": "abc123",
				},
			},
		},
		ActiveEnvironmentID: "env-1",
	}
	app.activeEnvironment = "env-1"

	_, err := app.SendRequest(HttpRequest{
		Method: POST,
		URL:    server.URL,
		Body: &RequestBody{
			Type: string(BodyURLEncoded),
			FormData: []KeyValue{
				{Key: "token", Value: "{{token}}", Enabled: true},
			},
		},
	})
	if err != nil {
		t.Fatalf("SendRequest() error = %v", err)
	}
	if gotBody != "token=abc123" {
		t.Fatalf("expected replaced form body, got %q", gotBody)
	}
}

func TestImportRequestsFromContentGeneratesNewIDs(t *testing.T) {
	tempDir := t.TempDir()
	storage := &RequestStorage{
		requests: []HttpRequest{
			{ID: "req-1", Name: "Original", Method: GET, URL: "/old", ProjectId: "old-project"},
		},
		filePath: filepath.Join(tempDir, "requests.json"),
	}

	content := []byte(`[
		{"id":"req-1","name":"Imported","method":"GET","url":"/new","headers":[],"params":[]}
	]`)

	if err := storage.ImportRequestsFromContent("new-project", content); err != nil {
		t.Fatalf("ImportRequestsFromContent() error = %v", err)
	}
	if len(storage.requests) != 2 {
		t.Fatalf("expected 2 requests, got %d", len(storage.requests))
	}
	if storage.requests[0].ProjectId != "old-project" {
		t.Fatalf("original request was overwritten")
	}
	if storage.requests[1].ID == "req-1" {
		t.Fatalf("imported request reused the original ID")
	}
	if storage.requests[1].ProjectId != "new-project" {
		t.Fatalf("expected imported request project new-project, got %s", storage.requests[1].ProjectId)
	}
}

func TestSaveRequestStoresProjectURLAsRelative(t *testing.T) {
	app := newRequestTestApp(t)
	app.projectStorage.projects = []Project{
		{
			ID:      "proj-1",
			Name:    "Test",
			BaseUrl: "api.example.com",
		},
	}

	err := app.SaveRequest(HttpRequest{
		ID:        "req-1",
		Name:      "Users",
		Method:    GET,
		URL:       "http://api.example.com/users",
		ProjectId: "proj-1",
	})
	if err != nil {
		t.Fatalf("SaveRequest() error = %v", err)
	}
	if len(app.requestStorage.requests) != 1 {
		t.Fatalf("expected 1 saved request, got %d", len(app.requestStorage.requests))
	}
	if app.requestStorage.requests[0].URL != "/users" {
		t.Fatalf("expected relative URL /users, got %s", app.requestStorage.requests[0].URL)
	}
}
