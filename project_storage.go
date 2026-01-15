package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

type ProjectStorage struct {
	mu       sync.RWMutex
	projects []Project
	filePath string
}

func NewProjectStorage() (*ProjectStorage, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}

	dataDir := filepath.Join(homeDir, ".postgo")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, err
	}

	filePath := filepath.Join(dataDir, "projects.json")

	storage := &ProjectStorage{
		projects: make([]Project, 0),
		filePath: filePath,
	}

	if err := storage.load(); err != nil {
		if !os.IsNotExist(err) {
			return nil, err
		}
	}

	return storage, nil
}

func (s *ProjectStorage) CreateProject(project Project) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	project.CreatedAt = time.Now()
	project.UpdatedAt = time.Now()
	s.projects = append(s.projects, project)

	err := s.save()
	if err != nil {
		return fmt.Errorf("failed to save project: %w", err)
	}
	
	return nil
}

func (s *ProjectStorage) GetAllProjects() []Project {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]Project, len(s.projects))
	copy(result, s.projects)
	
	sort.Slice(result, func(i, j int) bool {
		return result[i].UpdatedAt.After(result[j].UpdatedAt)
	})

	return result
}

func (s *ProjectStorage) GetProject(id string) *Project {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, project := range s.projects {
		if project.ID == id {
			return &project
		}
	}

	return nil
}

func (s *ProjectStorage) UpdateProject(project Project) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, p := range s.projects {
		if p.ID == project.ID {
			project.UpdatedAt = time.Now()
			project.CreatedAt = s.projects[i].CreatedAt
			s.projects[i] = project
			return s.save()
		}
	}

	return nil
}

func (s *ProjectStorage) DeleteProject(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, project := range s.projects {
		if project.ID == id {
			s.projects = append(s.projects[:i], s.projects[i+1:]...)
			return s.save()
		}
	}

	return nil
}

func (s *ProjectStorage) load() error {
	data, err := os.ReadFile(s.filePath)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, &s.projects)
}

func (s *ProjectStorage) save() error {
	data, err := json.MarshalIndent(s.projects, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.filePath, data, 0644)
}
