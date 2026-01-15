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

type TokenStorage struct {
	mu       sync.RWMutex
	tokens   []Token
	filePath string
}

func NewTokenStorage() (*TokenStorage, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}

	dataDir := filepath.Join(homeDir, ".postgo")
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, err
	}

	filePath := filepath.Join(dataDir, "tokens.json")

	storage := &TokenStorage{
		tokens:   make([]Token, 0),
		filePath: filePath,
	}

	if err := storage.load(); err != nil {
		if !os.IsNotExist(err) {
			return nil, err
		}
	}

	return storage, nil
}

func (s *TokenStorage) SaveToken(token Token) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	found := false
	for i, t := range s.tokens {
		if t.ID == token.ID {
			token.UpdatedAt = time.Now()
			token.CreatedAt = s.tokens[i].CreatedAt
			s.tokens[i] = token
			found = true
			break
		}
	}

	if !found {
		token.CreatedAt = time.Now()
		token.UpdatedAt = time.Now()
		s.tokens = append(s.tokens, token)
	}

	err := s.save()
	if err != nil {
		return fmt.Errorf("failed to save token: %w", err)
	}

	return nil
}

func (s *TokenStorage) GetAllTokens() []Token {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]Token, len(s.tokens))
	copy(result, s.tokens)

	sort.Slice(result, func(i, j int) bool {
		return result[i].UpdatedAt.After(result[j].UpdatedAt)
	})

	return result
}

func (s *TokenStorage) GetToken(id string) *Token {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, token := range s.tokens {
		if token.ID == id {
			return &token
		}
	}

	return nil
}

func (s *TokenStorage) DeleteToken(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, token := range s.tokens {
		if token.ID == id {
			s.tokens = append(s.tokens[:i], s.tokens[i+1:]...)
			return s.save()
		}
	}

	return nil
}

func (s *TokenStorage) load() error {
	data, err := os.ReadFile(s.filePath)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, &s.tokens)
}

func (s *TokenStorage) save() error {
	data, err := json.MarshalIndent(s.tokens, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.filePath, data, 0644)
}
