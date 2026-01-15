package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	ctx                context.Context
	httpClient         *HttpClient
	historyStorage     *HistoryStorage
	projectStorage     *ProjectStorage
	tokenStorage       *TokenStorage
	requestStorage     *RequestStorage
	environmentStorage *EnvironmentStorage
	tabStorage         *TabStorage
	activeEnvironment  string
}

func NewApp() *App {
	historyStorage, err := NewHistoryStorage()
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize history storage: %v", err))
	}

	projectStorage, err := NewProjectStorage()
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize project storage: %v", err))
	}

	tokenStorage, err := NewTokenStorage()
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize token storage: %v", err))
	}

	requestStorage, err := NewRequestStorage()
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize request storage: %v", err))
	}

	environmentStorage, err := NewEnvironmentStorage()
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize environment storage: %v", err))
	}

	tabStorage, err := NewTabStorage()
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize tab storage: %v", err))
	}

	// Migration: specific project requests from history to request storage if empty
	if len(requestStorage.requests) == 0 {
		history := historyStorage.GetHistory(1000)
		var toSave []HttpRequest
		for _, h := range history {
			if h.Request.ProjectId != "" {
				req := h.Request
				// Try to clean up URL by removing Base URL if present
				project := projectStorage.GetProject(req.ProjectId)
				if project != nil && project.BaseUrl != "" {
					baseUrl := strings.TrimSuffix(project.BaseUrl, "/")
					if strings.HasPrefix(req.URL, baseUrl) {
						req.URL = strings.TrimPrefix(req.URL, baseUrl)
						if !strings.HasPrefix(req.URL, "/") {
							req.URL = "/" + req.URL
						}
					}
				}
				toSave = append(toSave, req)
			}
		}
		if len(toSave) > 0 {
			requestStorage.AddRequests(toSave)
			fmt.Printf("Migrated %d requests from history to request storage\n", len(toSave))
		}
	}

	// Ensure consistency: Strip Base URL from all requests in storage
	cleanCount := 0
	for i, req := range requestStorage.requests {
		if req.ProjectId != "" {
			project := projectStorage.GetProject(req.ProjectId)
			if project != nil && project.BaseUrl != "" {
				baseUrl := strings.TrimSuffix(project.BaseUrl, "/")
				if strings.HasPrefix(req.URL, baseUrl) {
					requestStorage.requests[i].URL = strings.TrimPrefix(req.URL, baseUrl)
					if !strings.HasPrefix(requestStorage.requests[i].URL, "/") {
						requestStorage.requests[i].URL = "/" + requestStorage.requests[i].URL
					}
					cleanCount++
				}
			}
		}
	}
	if cleanCount > 0 {
		if err := requestStorage.save(); err != nil {
			fmt.Printf("Failed to save cleaned requests: %v\n", err)
		} else {
			fmt.Printf("Cleaned Base URL from %d requests\n", cleanCount)
		}
	}

	app := &App{
		httpClient:         NewHttpClient(),
		historyStorage:     historyStorage,
		projectStorage:     projectStorage,
		tokenStorage:       tokenStorage,
		requestStorage:     requestStorage,
		environmentStorage: environmentStorage,
		tabStorage:         tabStorage,
		activeEnvironment:  environmentStorage.GetActiveEnvironmentID(),
	}
	
	return app
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) SendRequest(req HttpRequest) (*HttpResponse, error) {
	processedReq := req
	
	scriptRunner := NewScriptRunner(a)
	
	if processedReq.Scripts != nil && processedReq.Scripts.PreRequest != "" {
		_, err := scriptRunner.RunPreRequestScript(&processedReq)
		if err != nil {
			fmt.Printf("Pre-request script error: %v\n", err)
		}
	}
	
	processedReq.URL = a.ReplaceVariables(processedReq.URL)
	
	for i, header := range processedReq.Headers {
		processedReq.Headers[i].Value = a.ReplaceVariables(header.Value)
	}
	
	for i, param := range processedReq.Params {
		processedReq.Params[i].Value = a.ReplaceVariables(param.Value)
	}
	
	if processedReq.Body != nil {
		processedReq.Body.Content = a.ReplaceVariables(processedReq.Body.Content)
	}
	
	resp, err := a.httpClient.SendRequest(processedReq)
	if err != nil {
		return nil, err
	}

	if processedReq.Scripts != nil && processedReq.Scripts.PostRequest != "" {
		scriptResult, err := scriptRunner.RunPostRequestScript(&processedReq, resp)
		if err != nil {
			fmt.Printf("Post-request script error: %v\n", err)
		}
		resp.ScriptResult = scriptResult
	}

	record := HistoryRecord{
		ID:       uuid.New().String(),
		Request:  processedReq,
		Response: *resp,
	}

	if err := a.historyStorage.AddRecord(record); err != nil {
		fmt.Printf("Failed to save history: %v\n", err)
	}

	return resp, nil
}

func (a *App) GetHistory(limit int) []HistoryRecord {
	return a.historyStorage.GetHistory(limit)
}

func (a *App) SearchHistory(query string) []HistoryRecord {
	return a.historyStorage.SearchHistory(query)
}

func (a *App) DeleteHistoryRecord(id string) error {
	return a.historyStorage.DeleteRecord(id)
}

func (a *App) ClearHistory() error {
	return a.historyStorage.ClearHistory()
}

func (a *App) CreateProject(project Project) error {
	fmt.Printf("Creating project: %+v\n", project)
	err := a.projectStorage.CreateProject(project)
	if err != nil {
		fmt.Printf("Error creating project: %v\n", err)
		return err
	}
	fmt.Printf("Project created successfully: %s\n", project.ID)
	return nil
}

func (a *App) GetAllProjects() []Project {
	projects := a.projectStorage.GetAllProjects()
	fmt.Printf("GetAllProjects returning %d projects\n", len(projects))
	return projects
}

func (a *App) GetProject(id string) *Project {
	return a.projectStorage.GetProject(id)
}

func (a *App) UpdateProject(project Project) error {
	return a.projectStorage.UpdateProject(project)
}

func (a *App) DeleteProject(id string) error {
	return a.projectStorage.DeleteProject(id)
}

func (a *App) GetProjectRequests(projectId string) []HistoryRecord {
	requests := a.requestStorage.GetProjectRequests(projectId)
	var result []HistoryRecord
	for _, req := range requests {
		result = append(result, HistoryRecord{
			ID:      req.ID,
			Request: req,
		})
	}
	return result
}

func (a *App) SaveToken(token Token) error {
	return a.tokenStorage.SaveToken(token)
}

func (a *App) GetAllTokens() []Token {
	return a.tokenStorage.GetAllTokens()
}

func (a *App) GetToken(id string) *Token {
	return a.tokenStorage.GetToken(id)
}

func (a *App) DeleteToken(id string) error {
	return a.tokenStorage.DeleteToken(id)
}

func (a *App) ImportOpenAPI(fileContent string, format string, projectId string, baseURL string) ([]HttpRequest, error) {
	spec, err := ParseOpenAPI([]byte(fileContent), format)
	if err != nil {
		return nil, fmt.Errorf("failed to parse OpenAPI file: %w", err)
	}

	requests := ConvertOpenAPIToRequests(spec, projectId, baseURL)
	
	if err := a.requestStorage.AddRequests(requests); err != nil {
		return nil, fmt.Errorf("failed to save requests: %w", err)
	}

	return requests, nil
}

func (a *App) ExportProjectAPI(projectId string) error {
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: "project_api.json",
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files", Pattern: "*.json"},
		},
	})
	if err != nil {
		return err
	}
	if path == "" {
		return nil
	}
	return a.requestStorage.ExportProjectRequests(projectId, path)
}

func (a *App) ImportProjectAPI(projectId string) error {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files", Pattern: "*.json"},
		},
	})
	if err != nil {
		return err
	}
	if path == "" {
		return nil
	}
	return a.requestStorage.ImportProjectRequests(projectId, path)
}

func (a *App) ImportProjectJSON(projectId string, content string) error {
	return a.requestStorage.ImportRequestsFromContent(projectId, []byte(content))
}

func (a *App) SaveRequest(req HttpRequest) error {
	return a.requestStorage.AddRequest(req)
}

func (a *App) UpdateRequest(req HttpRequest) error {
	return a.requestStorage.AddRequest(req)
}

func (a *App) DeleteRequest(id string) error {
	return a.requestStorage.DeleteRequest(id)
}

func (a *App) GetAllEnvironments() []Environment {
	return a.environmentStorage.GetAllEnvironments()
}

func (a *App) GetEnvironment(id string) *Environment {
	return a.environmentStorage.GetEnvironment(id)
}

func (a *App) SaveEnvironment(env Environment) error {
	return a.environmentStorage.SaveEnvironment(env)
}

func (a *App) DeleteEnvironment(id string) error {
	return a.environmentStorage.DeleteEnvironment(id)
}

func (a *App) SetActiveEnvironment(id string) error {
	a.activeEnvironment = id
	return a.environmentStorage.SetActiveEnvironmentID(id)
}

func (a *App) GetActiveEnvironment() string {
	if a.activeEnvironment == "" {
		a.activeEnvironment = a.environmentStorage.GetActiveEnvironmentID()
	}
	return a.activeEnvironment
}

func (a *App) ReplaceVariables(text string) string {
	if a.activeEnvironment == "" {
		return text
	}
	
	env := a.environmentStorage.GetEnvironment(a.activeEnvironment)
	if env == nil {
		return text
	}
	
	result := text
	for key, value := range env.Variables {
		result = strings.ReplaceAll(result, "{{"+key+"}}", value)
	}
	
	return result
}

func (a *App) GetSavedTabs() []TabState {
	return a.tabStorage.GetAllTabs()
}

func (a *App) SaveTabsState(tabs []TabState) error {
	return a.tabStorage.SaveTabs(tabs)
}

type BackupData struct {
	History      []HistoryRecord `json:"history"`
	Projects     []Project       `json:"projects"`
	Requests     []HttpRequest   `json:"requests"`
	Tokens       []Token         `json:"tokens"`
	Environments []Environment   `json:"environments"`
	Tabs         []TabState      `json:"tabs"`
}

func (a *App) ExportAllData() (string, error) {
	backup := BackupData{
		History:      a.historyStorage.GetHistory(10000),
		Projects:     a.projectStorage.GetAllProjects(),
		Tokens:       a.tokenStorage.GetAllTokens(),
		Environments: a.environmentStorage.GetAllEnvironments(),
		Tabs:         a.tabStorage.GetAllTabs(),
	}

	for _, proj := range backup.Projects {
		reqs := a.requestStorage.GetProjectRequests(proj.ID)
		backup.Requests = append(backup.Requests, reqs...)
	}

	data, err := json.MarshalIndent(backup, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal backup data: %w", err)
	}

	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		DefaultFilename: "postgo_backup.json",
		Title:           "Export All Data",
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files", Pattern: "*.json"},
		},
	})

	if err != nil {
		return "", err
	}

	if path == "" {
		return "", nil
	}

	if err := os.WriteFile(path, data, 0644); err != nil {
		return "", fmt.Errorf("failed to write backup file: %w", err)
	}

	return path, nil
}

func (a *App) ImportAllData() error {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Import Backup Data",
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Files", Pattern: "*.json"},
		},
	})

	if err != nil {
		return err
	}

	if path == "" {
		return nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("failed to read backup file: %w", err)
	}

	var backup BackupData
	if err := json.Unmarshal(data, &backup); err != nil {
		return fmt.Errorf("failed to parse backup data: %w", err)
	}

	for _, proj := range backup.Projects {
		if err := a.projectStorage.CreateProject(proj); err != nil {
			fmt.Printf("Warning: failed to import project %s: %v\n", proj.Name, err)
		}
	}

	for _, req := range backup.Requests {
		if err := a.requestStorage.AddRequest(req); err != nil {
			fmt.Printf("Warning: failed to import request: %v\n", err)
		}
	}

	for _, token := range backup.Tokens {
		if err := a.tokenStorage.SaveToken(token); err != nil {
			fmt.Printf("Warning: failed to import token %s: %v\n", token.Name, err)
		}
	}

	for _, env := range backup.Environments {
		if err := a.environmentStorage.SaveEnvironment(env); err != nil {
			fmt.Printf("Warning: failed to import environment %s: %v\n", env.Name, err)
		}
	}

	if len(backup.Tabs) > 0 {
		if err := a.tabStorage.SaveTabs(backup.Tabs); err != nil {
			fmt.Printf("Warning: failed to import tabs: %v\n", err)
		}
	}

	return nil
}
