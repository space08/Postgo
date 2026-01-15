package main

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type HttpClient struct {
	client *http.Client
}

func NewHttpClient() *HttpClient {
	return &HttpClient{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (h *HttpClient) SendRequest(req HttpRequest) (*HttpResponse, error) {
	startTime := time.Now()

	fullURL, err := h.buildURL(req.URL, req.Params)
	if err != nil {
		return nil, err
	}

	bodyReader, contentType, err := h.buildRequestBody(req.Body)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest(string(req.Method), fullURL, bodyReader)
	if err != nil {
		return nil, err
	}

	if contentType != "" {
		httpReq.Header.Set("Content-Type", contentType)
	}

	if req.Auth != nil {
		h.applyAuth(httpReq, req.Auth)
	}

	for _, header := range req.Headers {
		if header.Enabled {
			httpReq.Header.Set(header.Key, header.Value)
		}
	}

	resp, err := h.client.Do(httpReq)
	if err != nil {
		if strings.Contains(err.Error(), "timeout") || strings.Contains(err.Error(), "Timeout") {
			return nil, fmt.Errorf("请求超时 (30s): %w", err)
		}
		if strings.Contains(err.Error(), "connection refused") {
			return nil, fmt.Errorf("连接被拒绝: 无法连接到 %s", httpReq.URL.Host)
		}
		if strings.Contains(err.Error(), "no such host") {
			return nil, fmt.Errorf("域名解析失败: %s", httpReq.URL.Host)
		}
		return nil, fmt.Errorf("请求错误: %w", err)
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	duration := time.Since(startTime).Milliseconds()

	headers := make(map[string]string)
	for key, values := range resp.Header {
		headers[key] = strings.Join(values, ", ")
	}

	return &HttpResponse{
		Status:     resp.StatusCode,
		StatusText: resp.Status,
		Headers:    headers,
		Body:       string(responseBody),
		Size:       int64(len(responseBody)),
		Time:       duration,
	}, nil
}

func (h *HttpClient) buildURL(baseURL string, params []KeyValue) (string, error) {
	if len(params) == 0 {
		return baseURL, nil
	}

	parsedURL, err := url.Parse(baseURL)
	if err != nil {
		return "", err
	}

	query := parsedURL.Query()
	for _, param := range params {
		if param.Enabled {
			query.Set(param.Key, param.Value)
		}
	}

	parsedURL.RawQuery = query.Encode()
	return parsedURL.String(), nil
}

func (h *HttpClient) applyAuth(httpReq *http.Request, auth *Auth) {
	switch auth.Type {
	case AuthBasic:
		if auth.Username != "" || auth.Password != "" {
			credentials := auth.Username + ":" + auth.Password
			encoded := base64.StdEncoding.EncodeToString([]byte(credentials))
			httpReq.Header.Set("Authorization", "Basic "+encoded)
		}
	case AuthBearer:
		if auth.Token != "" {
			httpReq.Header.Set("Authorization", "Bearer "+auth.Token)
		}
	case AuthOAuth2:
		if auth.OAuth2AccessToken != "" {
			httpReq.Header.Set("Authorization", "Bearer "+auth.OAuth2AccessToken)
		}
	}
}

func (h *HttpClient) buildRequestBody(body *RequestBody) (io.Reader, string, error) {
	if body == nil || body.Type == "" || body.Type == string(BodyNone) {
		return nil, "", nil
	}

	switch body.Type {
	case string(BodyJSON):
		if body.Content == "" {
			return nil, "", nil
		}
		return strings.NewReader(body.Content), "application/json", nil

	case string(BodyXML):
		if body.Content == "" {
			return nil, "", nil
		}
		return strings.NewReader(body.Content), "application/xml", nil

	case string(BodyRaw):
		if body.Content == "" {
			return nil, "", nil
		}
		return strings.NewReader(body.Content), "text/plain", nil

	case string(BodyURLEncoded):
		if len(body.FormData) == 0 {
			return nil, "", nil
		}
		formData := url.Values{}
		for _, field := range body.FormData {
			if field.Enabled {
				formData.Add(field.Key, field.Value)
			}
		}
		return strings.NewReader(formData.Encode()), "application/x-www-form-urlencoded", nil

	case string(BodyFormData):
		if len(body.FormData) == 0 {
			return nil, "", nil
		}
		var buf bytes.Buffer
		writer := multipart.NewWriter(&buf)
		for _, field := range body.FormData {
			if field.Enabled {
				err := writer.WriteField(field.Key, field.Value)
				if err != nil {
					return nil, "", err
				}
			}
		}
		err := writer.Close()
		if err != nil {
			return nil, "", err
		}
		return &buf, writer.FormDataContentType(), nil

	default:
		if body.Content == "" {
			return nil, "", nil
		}
		return strings.NewReader(body.Content), "", nil
	}
}
