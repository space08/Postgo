package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

type HistoryStorage struct {
	mu       sync.RWMutex
	history  []HistoryRecord
	filePath string
}

func NewHistoryStorage() (*HistoryStorage, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}

	dataDir := filepath.Join(homeDir, ".postgo")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, err
	}

	filePath := filepath.Join(dataDir, "history.json")

	storage := &HistoryStorage{
		history:  make([]HistoryRecord, 0),
		filePath: filePath,
	}

	if err := storage.load(); err != nil {
		if !os.IsNotExist(err) {
			return nil, err
		}
	}

	return storage, nil
}

func (s *HistoryStorage) AddRecord(record HistoryRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, existingRecord := range s.history {
		if isRequestDuplicate(record.Request, existingRecord.Request) {
			s.history = append(s.history[:i], s.history[i+1:]...)
			break
		}
	}

	record.Timestamp = time.Now()
	s.history = append([]HistoryRecord{record}, s.history...)

	if len(s.history) > 100 {
		s.history = s.history[:100]
	}

	return s.save()
}

func (s *HistoryStorage) GetHistory(limit int) []HistoryRecord {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if limit <= 0 || limit > len(s.history) {
		limit = len(s.history)
	}

	result := make([]HistoryRecord, limit)
	copy(result, s.history[:limit])
	return result
}

func (s *HistoryStorage) SearchHistory(query string) []HistoryRecord {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if query == "" {
		return s.GetHistory(100)
	}

	var results []HistoryRecord
	for _, record := range s.history {
		if containsIgnoreCase(record.Request.URL, query) ||
			containsIgnoreCase(record.Request.Name, query) ||
			containsIgnoreCase(string(record.Request.Method), query) {
			results = append(results, record)
		}
	}

	return results
}

func (s *HistoryStorage) DeleteRecord(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, record := range s.history {
		if record.ID == id {
			s.history = append(s.history[:i], s.history[i+1:]...)
			return s.save()
		}
	}

	return nil
}

func (s *HistoryStorage) ClearHistory() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.history = make([]HistoryRecord, 0)
	return s.save()
}

func (s *HistoryStorage) load() error {
	data, err := os.ReadFile(s.filePath)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, &s.history)
}

func (s *HistoryStorage) save() error {
	data, err := json.MarshalIndent(s.history, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.filePath, data, 0644)
}

func containsIgnoreCase(str, substr string) bool {
	str = toLower(str)
	substr = toLower(substr)
	return contains(str, substr)
}

func toLower(s string) string {
	result := make([]rune, len(s))
	for i, r := range s {
		if r >= 'A' && r <= 'Z' {
			result[i] = r + ('a' - 'A')
		} else {
			result[i] = r
		}
	}
	return string(result)
}

func contains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func (s *HistoryStorage) SortByTime() {
	s.mu.Lock()
	defer s.mu.Unlock()

	sort.Slice(s.history, func(i, j int) bool {
		return s.history[i].Timestamp.After(s.history[j].Timestamp)
	})
}

func isRequestDuplicate(r1, r2 HttpRequest) bool {
	if r1.Method != r2.Method || r1.URL != r2.URL {
		return false
	}

	if !areKeyValuesEqual(r1.Headers, r2.Headers) {
		return false
	}

	if !areKeyValuesEqual(r1.Params, r2.Params) {
		return false
	}

	if !areRequestBodiesEqual(r1.Body, r2.Body) {
		return false
	}

	return true
}

func areKeyValuesEqual(kv1, kv2 []KeyValue) bool {
	if len(kv1) != len(kv2) {
		return false
	}

	map1 := make(map[string]KeyValue)
	for _, item := range kv1 {
		if item.Enabled {
			map1[item.Key] = item
		}
	}

	map2 := make(map[string]KeyValue)
	for _, item := range kv2 {
		if item.Enabled {
			map2[item.Key] = item
		}
	}

	if len(map1) != len(map2) {
		return false
	}

	for key, val1 := range map1 {
		val2, exists := map2[key]
		if !exists || val1.Value != val2.Value {
			return false
		}
	}

	return true
}

func areRequestBodiesEqual(b1, b2 *RequestBody) bool {
	if b1 == nil && b2 == nil {
		return true
	}
	if b1 == nil || b2 == nil {
		return false
	}

	if b1.Type != b2.Type {
		return false
	}

	if b1.Content != b2.Content {
		return false
	}

	return areKeyValuesEqual(b1.FormData, b2.FormData)
}
