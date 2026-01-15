package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

type Environment struct {
	ID        string            `json:"id"`
	Name      string            `json:"name"`
	Variables map[string]string `json:"variables"`
}

type EnvironmentData struct {
	Environments        []Environment `json:"environments"`
	ActiveEnvironmentID string        `json:"activeEnvironmentId"`
}

type EnvironmentStorage struct {
	mu           sync.RWMutex
	data         EnvironmentData
	filePath     string
}

func NewEnvironmentStorage() (*EnvironmentStorage, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}

	dataDir := filepath.Join(homeDir, ".postgo")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, err
	}

	filePath := filepath.Join(dataDir, "environments.json")

	storage := &EnvironmentStorage{
		data: EnvironmentData{
			Environments:        make([]Environment, 0),
			ActiveEnvironmentID: "",
		},
		filePath: filePath,
	}

	if err := storage.load(); err != nil {
		if !os.IsNotExist(err) {
			return nil, err
		}
	}

	return storage, nil
}

func (s *EnvironmentStorage) GetAllEnvironments() []Environment {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.data.Environments
}

func (s *EnvironmentStorage) GetEnvironment(id string) *Environment {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	for _, env := range s.data.Environments {
		if env.ID == id {
			return &env
		}
	}
	return nil
}

func (s *EnvironmentStorage) SaveEnvironment(env Environment) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, e := range s.data.Environments {
		if e.ID == env.ID {
			s.data.Environments[i] = env
			return s.save()
		}
	}

	s.data.Environments = append(s.data.Environments, env)
	return s.save()
}

func (s *EnvironmentStorage) DeleteEnvironment(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, env := range s.data.Environments {
		if env.ID == id {
			s.data.Environments = append(s.data.Environments[:i], s.data.Environments[i+1:]...)
			if s.data.ActiveEnvironmentID == id {
				s.data.ActiveEnvironmentID = ""
			}
			return s.save()
		}
	}

	return nil
}

func (s *EnvironmentStorage) GetActiveEnvironmentID() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.data.ActiveEnvironmentID
}

func (s *EnvironmentStorage) SetActiveEnvironmentID(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.data.ActiveEnvironmentID = id
	return s.save()
}

func (s *EnvironmentStorage) load() error {
	data, err := os.ReadFile(s.filePath)
	if err != nil {
		return err
	}

	var envData EnvironmentData
	if err := json.Unmarshal(data, &envData); err != nil {
		var envs []Environment
		if err := json.Unmarshal(data, &envs); err != nil {
			return err
		}
		s.data.Environments = envs
		s.data.ActiveEnvironmentID = ""
		return nil
	}

	s.data = envData
	return nil
}

func (s *EnvironmentStorage) save() error {
	data, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.filePath, data, 0644)
}
