package main

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"gopkg.in/yaml.v3"
)

type OpenAPISpec struct {
	OpenAPI string                `json:"openapi" yaml:"openapi"`
	Info    OpenAPIInfo           `json:"info" yaml:"info"`
	Paths   map[string]PathItem   `json:"paths" yaml:"paths"`
	Servers []OpenAPIServer       `json:"servers,omitempty" yaml:"servers,omitempty"`
}

type OpenAPIInfo struct {
	Title       string `json:"title" yaml:"title"`
	Version     string `json:"version" yaml:"version"`
	Description string `json:"description,omitempty" yaml:"description,omitempty"`
}

type OpenAPIServer struct {
	URL         string `json:"url" yaml:"url"`
	Description string `json:"description,omitempty" yaml:"description,omitempty"`
}

type PathItem struct {
	Get    *Operation `json:"get,omitempty" yaml:"get,omitempty"`
	Post   *Operation `json:"post,omitempty" yaml:"post,omitempty"`
	Put    *Operation `json:"put,omitempty" yaml:"put,omitempty"`
	Delete *Operation `json:"delete,omitempty" yaml:"delete,omitempty"`
	Patch  *Operation `json:"patch,omitempty" yaml:"patch,omitempty"`
	Head   *Operation `json:"head,omitempty" yaml:"head,omitempty"`
	Options *Operation `json:"options,omitempty" yaml:"options,omitempty"`
}

type Operation struct {
	Summary     string                `json:"summary,omitempty" yaml:"summary,omitempty"`
	Description string                `json:"description,omitempty" yaml:"description,omitempty"`
	Parameters  []Parameter           `json:"parameters,omitempty" yaml:"parameters,omitempty"`
	RequestBody *OpenAPIRequestBody   `json:"requestBody,omitempty" yaml:"requestBody,omitempty"`
	Responses   map[string]Response   `json:"responses,omitempty" yaml:"responses,omitempty"`
}

type Parameter struct {
	Name        string      `json:"name" yaml:"name"`
	In          string      `json:"in" yaml:"in"`
	Description string      `json:"description,omitempty" yaml:"description,omitempty"`
	Required    bool        `json:"required,omitempty" yaml:"required,omitempty"`
	Schema      *Schema     `json:"schema,omitempty" yaml:"schema,omitempty"`
}

type OpenAPIRequestBody struct {
	Description string                `json:"description,omitempty" yaml:"description,omitempty"`
	Required    bool                  `json:"required,omitempty" yaml:"required,omitempty"`
	Content     map[string]MediaType  `json:"content,omitempty" yaml:"content,omitempty"`
}

type MediaType struct {
	Schema *Schema `json:"schema,omitempty" yaml:"schema,omitempty"`
}

type Response struct {
	Description string               `json:"description,omitempty" yaml:"description,omitempty"`
	Content     map[string]MediaType `json:"content,omitempty" yaml:"content,omitempty"`
}

type Schema struct {
	Type       string             `json:"type,omitempty" yaml:"type,omitempty"`
	Properties map[string]*Schema `json:"properties,omitempty" yaml:"properties,omitempty"`
	Items      *Schema            `json:"items,omitempty" yaml:"items,omitempty"`
}

func ParseOpenAPI(data []byte, format string) (*OpenAPISpec, error) {
	var spec OpenAPISpec

	switch strings.ToLower(format) {
	case "json":
		if err := json.Unmarshal(data, &spec); err != nil {
			return nil, fmt.Errorf("failed to parse JSON: %w", err)
		}
	case "yaml", "yml":
		if err := yaml.Unmarshal(data, &spec); err != nil {
			return nil, fmt.Errorf("failed to parse YAML: %w", err)
		}
	default:
		return nil, fmt.Errorf("unsupported format: %s", format)
	}

	return &spec, nil
}

func ConvertOpenAPIToRequests(spec *OpenAPISpec, projectId string, baseURL string) []HttpRequest {
	var requests []HttpRequest

	// baseURL is intentionally ignored here to support dynamic Base URL in projects.
	// The path will be stored as relative (e.g. "/users") and the frontend/runtime 
	// will prepend the project's Base URL when executing or viewing the request.

	for path, pathItem := range spec.Paths {

		operations := map[string]*Operation{
			"GET":     pathItem.Get,
			"POST":    pathItem.Post,
			"PUT":     pathItem.Put,
			"DELETE":  pathItem.Delete,
			"PATCH":   pathItem.Patch,
			"HEAD":    pathItem.Head,
			"OPTIONS": pathItem.Options,
		}

		for method, operation := range operations {
			if operation == nil {
				continue
			}

			req := HttpRequest{
				ID:        fmt.Sprintf("req-%d", len(requests)),
				Name:      operation.Summary,
				Method:    HttpMethod(method),
				URL:       path,
				Headers:   []KeyValue{},
				Params:    []KeyValue{},
				ProjectId: projectId,
				Body:      &RequestBody{Type: "raw"},
			}

			if req.Name == "" {
				req.Name = operation.Description
			}
			if req.Name == "" {
				req.Name = fmt.Sprintf("%s %s", method, path)
			}

			for _, param := range operation.Parameters {
				if param.In == "query" {
					req.Params = append(req.Params, KeyValue{
						Key:     param.Name,
						Value:   "",
						Enabled: !param.Required,
					})
				} else if param.In == "header" {
					req.Headers = append(req.Headers, KeyValue{
						Key:     param.Name,
						Value:   "",
						Enabled: !param.Required,
					})
				}
			}

			if operation.RequestBody != nil {
				for contentType, mediaType := range operation.RequestBody.Content {
					if strings.Contains(contentType, "json") {
						req.Headers = append(req.Headers, KeyValue{
							Key:     "Content-Type",
							Value:   "application/json",
							Enabled: true,
						})
						if req.Body == nil {
							req.Body = &RequestBody{}
						}
						req.Body.Type = "raw"
						req.Body.Content = generateJSONExample(mediaType.Schema)
					} else if strings.Contains(contentType, "form") {
						if req.Body == nil {
							req.Body = &RequestBody{}
						}
						req.Body.Type = "form-data"
					}
				}
			}

			requests = append(requests, req)
		}
	}

	return requests
}

func generateJSONExample(schema *Schema) string {
	if schema == nil {
		return "{}"
	}

	if schema.Type == "object" && schema.Properties != nil {
		obj := make(map[string]interface{})
		for key := range schema.Properties {
			obj[key] = ""
		}
		data, _ := json.MarshalIndent(obj, "", "  ")
		return string(data)
	}

	return "{}"
}

func ReadFileContent(reader io.Reader) ([]byte, error) {
	return io.ReadAll(reader)
}
