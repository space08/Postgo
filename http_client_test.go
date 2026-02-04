package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNewHttpClient(t *testing.T) {
	client := NewHttpClient()
	if client == nil {
		t.Fatal("NewHttpClient returned nil")
	}
	if client.client == nil {
		t.Fatal("HttpClient.client is nil")
	}
}

func TestBuildURL(t *testing.T) {
	client := NewHttpClient()
	
	tests := []struct {
		name     string
		baseURL  string
		params   []KeyValue
		expected string
		hasError bool
	}{
		{
			name:     "No parameters",
			baseURL:  "https://api.example.com/users",
			params:   []KeyValue{},
			expected: "https://api.example.com/users",
			hasError: false,
		},
		{
			name:    "Single parameter",
			baseURL: "https://api.example.com/users",
			params: []KeyValue{
				{Key: "id", Value: "123", Enabled: true},
			},
			expected: "https://api.example.com/users?id=123",
			hasError: false,
		},
		{
			name:    "Multiple parameters",
			baseURL: "https://api.example.com/users",
			params: []KeyValue{
				{Key: "id", Value: "123", Enabled: true},
				{Key: "name", Value: "test", Enabled: true},
			},
			expected: "https://api.example.com/users?id=123&name=test",
			hasError: false,
		},
		{
			name:    "Disabled parameter",
			baseURL: "https://api.example.com/users",
			params: []KeyValue{
				{Key: "id", Value: "123", Enabled: true},
				{Key: "name", Value: "test", Enabled: false},
			},
			expected: "https://api.example.com/users?id=123",
			hasError: false,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := client.buildURL(tt.baseURL, tt.params)
			if (err != nil) != tt.hasError {
				t.Errorf("buildURL() error = %v, hasError %v", err, tt.hasError)
				return
			}
			if result != tt.expected {
				t.Errorf("buildURL() = %v, expected %v", result, tt.expected)
			}
		})
	}
}

func TestApplyAuth(t *testing.T) {
	client := NewHttpClient()
	
	tests := []struct {
		name     string
		auth     *Auth
		expected string
	}{
		{
			name: "Basic Auth",
			auth: &Auth{
				Type:     AuthBasic,
				Username: "user",
				Password: "pass",
			},
			expected: "Basic dXNlcjpwYXNz",
		},
		{
			name: "Bearer Token",
			auth: &Auth{
				Type:  AuthBearer,
				Token: "test-token",
			},
			expected: "Bearer test-token",
		},
		{
			name: "OAuth2",
			auth: &Auth{
				Type:              AuthOAuth2,
				OAuth2AccessToken: "oauth-token",
			},
			expected: "Bearer oauth-token",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest("GET", "https://example.com", nil)
			client.applyAuth(req, tt.auth)
			
			authHeader := req.Header.Get("Authorization")
			if authHeader != tt.expected {
				t.Errorf("applyAuth() Authorization header = %v, expected %v", authHeader, tt.expected)
			}
		})
	}
}

func TestBuildRequestBody(t *testing.T) {
	client := NewHttpClient()
	
	tests := []struct {
		name        string
		body        *RequestBody
		expectedCT  string
		expectedErr bool
	}{
		{
			name:        "Nil body",
			body:        nil,
			expectedCT:  "",
			expectedErr: false,
		},
		{
			name: "JSON body",
			body: &RequestBody{
				Type:    string(BodyJSON),
				Content: `{"key":"value"}`,
			},
			expectedCT:  "application/json",
			expectedErr: false,
		},
		{
			name: "XML body",
			body: &RequestBody{
				Type:    string(BodyXML),
				Content: `<root>test</root>`,
			},
			expectedCT:  "application/xml",
			expectedErr: false,
		},
		{
			name: "Raw body",
			body: &RequestBody{
				Type:    string(BodyRaw),
				Content: "plain text",
			},
			expectedCT:  "text/plain",
			expectedErr: false,
		},
		{
			name: "URL Encoded body",
			body: &RequestBody{
				Type: string(BodyURLEncoded),
				FormData: []KeyValue{
					{Key: "key1", Value: "value1", Enabled: true},
					{Key: "key2", Value: "value2", Enabled: true},
				},
			},
			expectedCT:  "application/x-www-form-urlencoded",
			expectedErr: false,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, contentType, err := client.buildRequestBody(tt.body)
			if (err != nil) != tt.expectedErr {
				t.Errorf("buildRequestBody() error = %v, expectedErr %v", err, tt.expectedErr)
				return
			}
			if contentType != tt.expectedCT {
				t.Errorf("buildRequestBody() contentType = %v, expected %v", contentType, tt.expectedCT)
			}
		})
	}
}

func TestSendRequest(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/test" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`{"message":"success"}`))
		} else {
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()
	
	client := NewHttpClient()
	
	tests := []struct {
		name           string
		request        HttpRequest
		expectedStatus int
		expectError    bool
	}{
		{
			name: "Successful GET request",
			request: HttpRequest{
				Method: GET,
				URL:    server.URL + "/test",
			},
			expectedStatus: 200,
			expectError:    false,
		},
		{
			name: "404 Not Found",
			request: HttpRequest{
				Method: GET,
				URL:    server.URL + "/notfound",
			},
			expectedStatus: 404,
			expectError:    false,
		},
		{
			name: "Request with headers",
			request: HttpRequest{
				Method: GET,
				URL:    server.URL + "/test",
				Headers: []KeyValue{
					{Key: "X-Custom-Header", Value: "test", Enabled: true},
				},
			},
			expectedStatus: 200,
			expectError:    false,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp, err := client.SendRequest(tt.request)
			if (err != nil) != tt.expectError {
				t.Errorf("SendRequest() error = %v, expectError %v", err, tt.expectError)
				return
			}
			if !tt.expectError {
				if resp.Status != tt.expectedStatus {
					t.Errorf("SendRequest() status = %v, expected %v", resp.Status, tt.expectedStatus)
				}
				if resp.Time < 0 {
					t.Errorf("SendRequest() response time should be >= 0, got %d", resp.Time)
				}
			}
		})
	}
}
