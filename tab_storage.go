package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

type TabState struct {
	ID       string      `json:"id"`
	Title    string      `json:"title"`
	Request  HttpRequest `json:"request"`
	IsActive bool        `json:"isActive"`
}

type TabStorage struct {
	mu       sync.RWMutex
	tabs     []TabState
	filePath string
}

func NewTabStorage() (*TabStorage, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}

	dataDir := filepath.Join(homeDir, ".postgo")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, err
	}

	filePath := filepath.Join(dataDir, "tabs.json")

	storage := &TabStorage{
		tabs:     make([]TabState, 0),
		filePath: filePath,
	}

	if err := storage.load(); err != nil {
		if !os.IsNotExist(err) {
			return nil, err
		}
	}

	return storage, nil
}

func (s *TabStorage) GetAllTabs() []TabState {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.tabs
}

func (s *TabStorage) SaveTabs(tabs []TabState) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.tabs = tabs
	return s.save()
}

func (s *TabStorage) load() error {
	data, err := os.ReadFile(s.filePath)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, &s.tabs)
}

func (s *TabStorage) save() error {
	data, err := json.MarshalIndent(s.tabs, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.filePath, data, 0644)
}
