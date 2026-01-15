package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

type RequestStorage struct {
	mu       sync.RWMutex
	requests []HttpRequest
	filePath string
}

func NewRequestStorage() (*RequestStorage, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}

	dataDir := filepath.Join(homeDir, ".postgo")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, err
	}

	filePath := filepath.Join(dataDir, "requests.json")

	storage := &RequestStorage{
		requests: make([]HttpRequest, 0),
		filePath: filePath,
	}

	if err := storage.load(); err != nil {
		if !os.IsNotExist(err) {
			return nil, err
		}
	}

	return storage, nil
}

func (s *RequestStorage) AddRequest(req HttpRequest) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Check if ID exists, if so update it
	for i, r := range s.requests {
		if r.ID == req.ID {
			s.requests[i] = req
			return s.save()
		}
	}

	s.requests = append(s.requests, req)
	return s.save()
}

func (s *RequestStorage) AddRequests(reqs []HttpRequest) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, req := range reqs {
		found := false
		for i, r := range s.requests {
			if r.ID == req.ID {
				s.requests[i] = req
				found = true
				break
			}
		}
		if !found {
			s.requests = append(s.requests, req)
		}
	}
	return s.save()
}

func (s *RequestStorage) GetProjectRequests(projectId string) []HttpRequest {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []HttpRequest
	for _, req := range s.requests {
		if req.ProjectId == projectId {
			result = append(result, req)
		}
	}
	return result
}

func (s *RequestStorage) DeleteRequest(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, req := range s.requests {
		if req.ID == id {
			s.requests = append(s.requests[:i], s.requests[i+1:]...)
			return s.save()
		}
	}

	return nil
}

func (s *RequestStorage) load() error {
	data, err := os.ReadFile(s.filePath)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, &s.requests)
}

func (s *RequestStorage) save() error {
	data, err := json.MarshalIndent(s.requests, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.filePath, data, 0644)
}

// ExportProjectRequests exports requests for a given project to a file
func (s *RequestStorage) ExportProjectRequests(projectId string, filePath string) error {
	requests := s.GetProjectRequests(projectId)
	
	data, err := json.MarshalIndent(requests, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal requests: %w", err)
	}

	return os.WriteFile(filePath, data, 0644)
}

// ImportRequestsFromContent imports requests from a byte slice into a project
func (s *RequestStorage) ImportRequestsFromContent(projectId string, content []byte) error {
	var requests []HttpRequest
	if err := json.Unmarshal(content, &requests); err != nil {
		return fmt.Errorf("failed to unmarshal requests: %w", err)
	}

	// Override projectId and ensure ID uniqueness if needed (or keep original ID)
	// For now, we'll keep original ID but update projectId
	for i := range requests {
		requests[i].ProjectId = projectId
	}

	return s.AddRequests(requests)
}

// ImportProjectRequests imports requests from a file into a project
func (s *RequestStorage) ImportProjectRequests(projectId string, filePath string) error {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to read file: %w", err)
	}

	return s.ImportRequestsFromContent(projectId, data)
}
