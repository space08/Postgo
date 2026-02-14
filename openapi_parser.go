package main

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"github.com/google/uuid"
	"gopkg.in/yaml.v3"
)

type OpenAPISpec struct {
	OpenAPI   string                `json:"openapi" yaml:"openapi"`
	Info      OpenAPIInfo           `json:"info" yaml:"info"`
	Paths     map[string]PathItem   `json:"paths" yaml:"paths"`
	Servers   []OpenAPIServer       `json:"servers,omitempty" yaml:"servers,omitempty"`
	PathOrder []string              `json:"-" yaml:"-"`
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
	Format     string             `json:"format,omitempty" yaml:"format,omitempty"`
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
		spec.PathOrder = extractPathOrderFromJSON(data)
	case "yaml", "yml":
		if err := yaml.Unmarshal(data, &spec); err != nil {
			return nil, fmt.Errorf("failed to parse YAML: %w", err)
		}
		spec.PathOrder = extractPathOrderFromYAML(data)
	default:
		return nil, fmt.Errorf("unsupported format: %s", format)
	}

	return &spec, nil
}

func extractPathOrderFromYAML(data []byte) []string {
	var node yaml.Node
	if err := yaml.Unmarshal(data, &node); err != nil {
		return nil
	}

	var pathOrder []string
	if node.Kind == yaml.DocumentNode && len(node.Content) > 0 {
		root := node.Content[0]
		if root.Kind == yaml.MappingNode {
			for i := 0; i < len(root.Content); i += 2 {
				key := root.Content[i]
				value := root.Content[i+1]
				if key.Value == "paths" && value.Kind == yaml.MappingNode {
					for j := 0; j < len(value.Content); j += 2 {
						pathKey := value.Content[j]
						pathOrder = append(pathOrder, pathKey.Value)
					}
					break
				}
			}
		}
	}
	return pathOrder
}

func extractPathOrderFromJSON(data []byte) []string {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil
	}

	pathsRaw, ok := raw["paths"]
	if !ok {
		return nil
	}

	var pathsMap map[string]json.RawMessage
	if err := json.Unmarshal(pathsRaw, &pathsMap); err != nil {
		return nil
	}

	decoder := json.NewDecoder(strings.NewReader(string(pathsRaw)))
	token, err := decoder.Token()
	if err != nil || token != json.Delim('{') {
		return nil
	}

	var pathOrder []string
	for decoder.More() {
		token, err := decoder.Token()
		if err != nil {
			break
		}
		if key, ok := token.(string); ok {
			pathOrder = append(pathOrder, key)
			var value json.RawMessage
			decoder.Decode(&value)
		}
	}

	return pathOrder
}

func ConvertOpenAPIToRequests(spec *OpenAPISpec, projectId string, baseURL string) []HttpRequest {
	var requests []HttpRequest

	// baseURL is intentionally ignored here to support dynamic Base URL in projects.
	// The path will be stored as relative (e.g. "/users") and the frontend/runtime 
	// will prepend the project's Base URL when executing or viewing the request.

	// Use PathOrder if available, otherwise fall back to map iteration
	pathsToProcess := spec.PathOrder
	if len(pathsToProcess) == 0 {
		pathsToProcess = make([]string, 0, len(spec.Paths))
		for path := range spec.Paths {
			pathsToProcess = append(pathsToProcess, path)
		}
	}

	for _, path := range pathsToProcess {
		pathItem, exists := spec.Paths[path]
		if !exists {
			continue
		}

		// Process methods in a defined order
		methodOrder := []struct {
			name string
			op   *Operation
		}{
			{"GET", pathItem.Get},
			{"POST", pathItem.Post},
			{"PUT", pathItem.Put},
			{"DELETE", pathItem.Delete},
			{"PATCH", pathItem.Patch},
			{"HEAD", pathItem.Head},
			{"OPTIONS", pathItem.Options},
		}

		for _, methodInfo := range methodOrder {
			operation := methodInfo.op
			if operation == nil {
				continue
			}
			method := methodInfo.name

			req := HttpRequest{
				ID:        generateUniqueID(),
				Name:      operation.Summary,
				Method:    HttpMethod(method),
				URL:       path,
				Headers:   []KeyValue{},
				Params:    []KeyValue{},
				ProjectId: projectId,
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
						Enabled: true,
					})
				} else if param.In == "header" {
					req.Headers = append(req.Headers, KeyValue{
						Key:     param.Name,
						Value:   "",
						Enabled: true,
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
						req.Body.Type = "json"
						req.Body.Content = generateJSONExample(mediaType.Schema)
					} else if strings.Contains(contentType, "multipart/form-data") {
						if req.Body == nil {
							req.Body = &RequestBody{}
						}
						req.Body.Type = "form-data"
						req.Body.FormData = generateFormDataFields(mediaType.Schema)
					} else if strings.Contains(contentType, "x-www-form-urlencoded") {
						if req.Body == nil {
							req.Body = &RequestBody{}
						}
						req.Body.Type = "x-www-form-urlencoded"
						req.Body.FormData = generateFormDataFields(mediaType.Schema)
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

func generateFormDataFields(schema *Schema) []KeyValue {
	var fields []KeyValue
	
	if schema == nil || schema.Properties == nil {
		return fields
	}
	
	for key, prop := range schema.Properties {
		field := KeyValue{
			Key:     key,
			Value:   "",
			Enabled: true,
		}
		
		if prop.Format == "binary" || (prop.Type == "string" && prop.Format == "binary") {
			field.Type = "file"
			field.FilePath = ""
		} else {
			field.Type = "text"
		}
		
		fields = append(fields, field)
	}
	
	return fields
}

func ReadFileContent(reader io.Reader) ([]byte, error) {
	return io.ReadAll(reader)
}

func generateUniqueID() string {
	return uuid.New().String()
}
