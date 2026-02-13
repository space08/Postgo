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

type HeaderStorage struct {
	mu       sync.RWMutex
	headers  []Header
	filePath string
}

func NewHeaderStorage() (*HeaderStorage, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}

	dataDir := filepath.Join(homeDir, ".postgo")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, err
	}

	filePath := filepath.Join(dataDir, "headers.json")

	storage := &HeaderStorage{
		headers:  make([]Header, 0),
		filePath: filePath,
	}

	if err := storage.load(); err != nil {
		if !os.IsNotExist(err) {
			return nil, err
		}
	}

	return storage, nil
}

func (s *HeaderStorage) SaveHeader(header Header) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Validate header value is not empty or undefined
	if header.Value == "" || header.Value == "undefined" || header.Value == "null" {
		return fmt.Errorf("invalid header value: cannot be empty, undefined, or null")
	}

	// Check if a header with the same HeaderKey and Value already exists
	for i, h := range s.headers {
		decryptedValue, err := Decrypt(h.Value)
		if err != nil {
			decryptedValue = h.Value
		}
		if h.HeaderKey == header.HeaderKey && decryptedValue == header.Value {
			// Same header already exists, just update the timestamp
			s.headers[i].UpdatedAt = time.Now()
			return s.save()
		}
	}

	// Encrypt the new value
	encryptedValue, err := Encrypt(header.Value)
	if err != nil {
		LogWarn("Failed to encrypt header value, saving as plaintext: %v", err)
		encryptedValue = header.Value
	}
	header.Value = encryptedValue

	// Check if updating by ID
	found := false
	for i, h := range s.headers {
		if h.ID == header.ID {
			header.UpdatedAt = time.Now()
			header.CreatedAt = s.headers[i].CreatedAt
			s.headers[i] = header
			found = true
			break
		}
	}

	if !found {
		header.CreatedAt = time.Now()
		header.UpdatedAt = time.Now()
		s.headers = append(s.headers, header)
	}

	err = s.save()
	if err != nil {
		return fmt.Errorf("failed to save header: %w", err)
	}

	return nil
}

func (s *HeaderStorage) GetAllHeaders() []Header {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]Header, len(s.headers))
	for i, header := range s.headers {
		decryptedValue, err := Decrypt(header.Value)
		if err != nil {
			LogWarn("Failed to decrypt header %s, using encrypted value: %v", header.ID, err)
			decryptedValue = header.Value
		}
		header.Value = decryptedValue
		result[i] = header
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].UpdatedAt.After(result[j].UpdatedAt)
	})

	return result
}

func (s *HeaderStorage) GetHeader(id string) *Header {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, header := range s.headers {
		if header.ID == id {
			decryptedValue, err := Decrypt(header.Value)
			if err != nil {
				LogWarn("Failed to decrypt header %s, using encrypted value: %v", header.ID, err)
				decryptedValue = header.Value
			}
			header.Value = decryptedValue
			return &header
		}
	}

	return nil
}

func (s *HeaderStorage) DeleteHeader(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, header := range s.headers {
		if header.ID == id {
			s.headers = append(s.headers[:i], s.headers[i+1:]...)
			return s.save()
		}
	}

	return nil
}

func (s *HeaderStorage) load() error {
	data, err := os.ReadFile(s.filePath)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, &s.headers)
}

func (s *HeaderStorage) save() error {
	data, err := json.MarshalIndent(s.headers, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.filePath, data, 0644)
}
