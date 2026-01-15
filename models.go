package main

import "time"

type HttpMethod string

const (
	GET     HttpMethod = "GET"
	POST    HttpMethod = "POST"
	PUT     HttpMethod = "PUT"
	DELETE  HttpMethod = "DELETE"
	PATCH   HttpMethod = "PATCH"
	HEAD    HttpMethod = "HEAD"
	OPTIONS HttpMethod = "OPTIONS"
)

type KeyValue struct {
	Key     string `json:"key"`
	Value   string `json:"value"`
	Enabled bool   `json:"enabled"`
}

type BodyType string

const (
	BodyNone        BodyType = "none"
	BodyJSON        BodyType = "json"
	BodyFormData    BodyType = "form-data"
	BodyURLEncoded  BodyType = "x-www-form-urlencoded"
	BodyRaw         BodyType = "raw"
	BodyXML         BodyType = "xml"
	BodyBinary      BodyType = "binary"
)

type RequestBody struct {
	Type       string     `json:"type"`
	Content    string     `json:"content,omitempty"`
	FormData   []KeyValue `json:"formData,omitempty"`
}

type AuthType string

const (
	AuthNone   AuthType = "none"
	AuthBasic  AuthType = "basic"
	AuthBearer AuthType = "bearer"
	AuthOAuth2 AuthType = "oauth2"
)

type Auth struct {
	Type     AuthType `json:"type"`
	Username string   `json:"username,omitempty"`
	Password string   `json:"password,omitempty"`
	Token    string   `json:"token,omitempty"`
	
	// OAuth 2.0 fields
	OAuth2GrantType  string `json:"oauth2GrantType,omitempty"`  // "authorization_code", "client_credentials", "password"
	OAuth2AuthUrl    string `json:"oauth2AuthUrl,omitempty"`
	OAuth2TokenUrl   string `json:"oauth2TokenUrl,omitempty"`
	OAuth2ClientId   string `json:"oauth2ClientId,omitempty"`
	OAuth2ClientSecret string `json:"oauth2ClientSecret,omitempty"`
	OAuth2Scope      string `json:"oauth2Scope,omitempty"`
	OAuth2RedirectUrl string `json:"oauth2RedirectUrl,omitempty"`
	OAuth2AccessToken string `json:"oauth2AccessToken,omitempty"`
	OAuth2RefreshToken string `json:"oauth2RefreshToken,omitempty"`
}

type Scripts struct {
	PreRequest  string `json:"preRequest,omitempty"`
	PostRequest string `json:"postRequest,omitempty"`
}

type HttpRequest struct {
	ID        string       `json:"id"`
	Name      string       `json:"name"`
	Method    HttpMethod   `json:"method"`
	URL       string       `json:"url"`
	Headers   []KeyValue   `json:"headers"`
	Params    []KeyValue   `json:"params"`
	Body      *RequestBody `json:"body,omitempty"`
	Auth      *Auth        `json:"auth,omitempty"`
	Scripts   *Scripts     `json:"scripts,omitempty"`
	ProjectId string       `json:"projectId,omitempty"`
}

type TestResult struct {
	Name   string `json:"name"`
	Passed bool   `json:"passed"`
	Error  string `json:"error,omitempty"`
}

type ScriptResult struct {
	ConsoleOutput []string     `json:"consoleOutput,omitempty"`
	Tests         []TestResult `json:"tests,omitempty"`
	Error         string       `json:"error,omitempty"`
}

type HttpResponse struct {
	Status       int               `json:"status"`
	StatusText   string            `json:"statusText"`
	Headers      map[string]string `json:"headers"`
	Body         string            `json:"body"`
	Size         int64             `json:"size"`
	Time         int64             `json:"time"`
	ScriptResult *ScriptResult     `json:"scriptResult,omitempty"`
}

type HistoryRecord struct {
	ID        string       `json:"id"`
	Timestamp time.Time    `json:"timestamp"`
	Request   HttpRequest  `json:"request"`
	Response  HttpResponse `json:"response"`
}

type Project struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	BaseUrl     string    `json:"baseUrl,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Token struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Value     string    `json:"value"`
	HeaderKey string    `json:"headerKey"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
