package main

import "testing"

func TestNormalizeHTTPURL(t *testing.T) {
	tests := []struct {
		name     string
		raw      string
		expected string
	}{
		{name: "HTTP URL", raw: "http://example.com", expected: "http://example.com"},
		{name: "HTTPS URL", raw: "https://example.com", expected: "https://example.com"},
		{name: "Host without protocol", raw: "example.com/api", expected: "http://example.com/api"},
		{name: "Host port without protocol", raw: "localhost:8080/api", expected: "http://localhost:8080/api"},
		{name: "Protocol relative URL", raw: "//example.com/api", expected: "http://example.com/api"},
		{name: "Relative path", raw: "/api", expected: "/api"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := normalizeHTTPURL(tt.raw); got != tt.expected {
				t.Fatalf("normalizeHTTPURL() = %q, expected %q", got, tt.expected)
			}
		})
	}
}

func TestResolveRequestURL(t *testing.T) {
	tests := []struct {
		name        string
		rawURL      string
		projectBase string
		expected    string
	}{
		{name: "Project absolute path", rawURL: "/users", projectBase: "api.example.com", expected: "http://api.example.com/users"},
		{name: "Project relative path", rawURL: "v1/users", projectBase: "https://api.example.com/root", expected: "https://api.example.com/root/v1/users"},
		{name: "Host without protocol wins over project base", rawURL: "example.com/users", projectBase: "https://api.internal", expected: "http://example.com/users"},
		{name: "Host port without protocol wins over project base", rawURL: "localhost:8080/users", projectBase: "https://api.internal", expected: "http://localhost:8080/users"},
		{name: "Absolute URL stays absolute", rawURL: "https://example.com/users", projectBase: "https://api.internal", expected: "https://example.com/users"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := resolveRequestURL(tt.rawURL, tt.projectBase); got != tt.expected {
				t.Fatalf("resolveRequestURL() = %q, expected %q", got, tt.expected)
			}
		})
	}
}
