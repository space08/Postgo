package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type OAuth2Handler struct {
	app *App
}

func NewOAuth2Handler(app *App) *OAuth2Handler {
	return &OAuth2Handler{app: app}
}

type OAuth2TokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token,omitempty"`
	Scope        string `json:"scope,omitempty"`
}

func (h *OAuth2Handler) GetAuthorizationUrl(auth *Auth) (string, error) {
	if auth.OAuth2AuthUrl == "" || auth.OAuth2ClientId == "" {
		return "", fmt.Errorf("授权URL和客户端ID不能为空")
	}

	authUrl, err := url.Parse(auth.OAuth2AuthUrl)
	if err != nil {
		return "", fmt.Errorf("无效的授权URL: %w", err)
	}

	params := url.Values{}
	params.Add("client_id", auth.OAuth2ClientId)
	params.Add("response_type", "code")
	
	if auth.OAuth2RedirectUrl != "" {
		params.Add("redirect_uri", auth.OAuth2RedirectUrl)
	}
	
	if auth.OAuth2Scope != "" {
		params.Add("scope", auth.OAuth2Scope)
	}
	
	params.Add("state", "postgo_oauth2_state")
	
	authUrl.RawQuery = params.Encode()
	return authUrl.String(), nil
}

func (h *OAuth2Handler) ExchangeCodeForToken(auth *Auth, code string) (*OAuth2TokenResponse, error) {
	if auth.OAuth2TokenUrl == "" {
		return nil, fmt.Errorf("令牌URL不能为空")
	}

	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("client_id", auth.OAuth2ClientId)
	data.Set("client_secret", auth.OAuth2ClientSecret)
	
	if auth.OAuth2RedirectUrl != "" {
		data.Set("redirect_uri", auth.OAuth2RedirectUrl)
	}

	return h.requestToken(auth.OAuth2TokenUrl, data)
}

func (h *OAuth2Handler) GetClientCredentialsToken(auth *Auth) (*OAuth2TokenResponse, error) {
	if auth.OAuth2TokenUrl == "" {
		return nil, fmt.Errorf("令牌URL不能为空")
	}

	data := url.Values{}
	data.Set("grant_type", "client_credentials")
	data.Set("client_id", auth.OAuth2ClientId)
	data.Set("client_secret", auth.OAuth2ClientSecret)
	
	if auth.OAuth2Scope != "" {
		data.Set("scope", auth.OAuth2Scope)
	}

	return h.requestToken(auth.OAuth2TokenUrl, data)
}

func (h *OAuth2Handler) GetPasswordToken(auth *Auth, username, password string) (*OAuth2TokenResponse, error) {
	if auth.OAuth2TokenUrl == "" {
		return nil, fmt.Errorf("令牌URL不能为空")
	}

	data := url.Values{}
	data.Set("grant_type", "password")
	data.Set("username", username)
	data.Set("password", password)
	data.Set("client_id", auth.OAuth2ClientId)
	data.Set("client_secret", auth.OAuth2ClientSecret)
	
	if auth.OAuth2Scope != "" {
		data.Set("scope", auth.OAuth2Scope)
	}

	return h.requestToken(auth.OAuth2TokenUrl, data)
}

func (h *OAuth2Handler) RefreshToken(auth *Auth) (*OAuth2TokenResponse, error) {
	if auth.OAuth2TokenUrl == "" || auth.OAuth2RefreshToken == "" {
		return nil, fmt.Errorf("令牌URL和刷新令牌不能为空")
	}

	data := url.Values{}
	data.Set("grant_type", "refresh_token")
	data.Set("refresh_token", auth.OAuth2RefreshToken)
	data.Set("client_id", auth.OAuth2ClientId)
	data.Set("client_secret", auth.OAuth2ClientSecret)

	return h.requestToken(auth.OAuth2TokenUrl, data)
}

func (h *OAuth2Handler) requestToken(tokenUrl string, data url.Values) (*OAuth2TokenResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "POST", tokenUrl, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("请求令牌失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("令牌请求失败 (状态码 %d): %s", resp.StatusCode, string(body))
	}

	var tokenResp OAuth2TokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("解析令牌响应失败: %w", err)
	}

	return &tokenResp, nil
}

func (a *App) StartOAuth2Flow(auth Auth) error {
	handler := NewOAuth2Handler(a)
	
	authUrl, err := handler.GetAuthorizationUrl(&auth)
	if err != nil {
		return err
	}

	runtime.BrowserOpenURL(a.ctx, authUrl)
	return nil
}

func (a *App) ExchangeOAuth2Code(auth Auth, code string) (Auth, error) {
	handler := NewOAuth2Handler(a)
	
	tokenResp, err := handler.ExchangeCodeForToken(&auth, code)
	if err != nil {
		return auth, err
	}

	auth.OAuth2AccessToken = tokenResp.AccessToken
	auth.OAuth2RefreshToken = tokenResp.RefreshToken

	return auth, nil
}

func (a *App) GetOAuth2ClientCredentialsToken(auth Auth) (Auth, error) {
	handler := NewOAuth2Handler(a)
	
	tokenResp, err := handler.GetClientCredentialsToken(&auth)
	if err != nil {
		return auth, err
	}

	auth.OAuth2AccessToken = tokenResp.AccessToken
	auth.OAuth2RefreshToken = tokenResp.RefreshToken

	return auth, nil
}

func (a *App) GetOAuth2PasswordToken(auth Auth, username, password string) (Auth, error) {
	handler := NewOAuth2Handler(a)
	
	tokenResp, err := handler.GetPasswordToken(&auth, username, password)
	if err != nil {
		return auth, err
	}

	auth.OAuth2AccessToken = tokenResp.AccessToken
	auth.OAuth2RefreshToken = tokenResp.RefreshToken

	return auth, nil
}

func (a *App) RefreshOAuth2Token(auth Auth) (Auth, error) {
	handler := NewOAuth2Handler(a)
	
	tokenResp, err := handler.RefreshToken(&auth)
	if err != nil {
		return auth, err
	}

	auth.OAuth2AccessToken = tokenResp.AccessToken
	if tokenResp.RefreshToken != "" {
		auth.OAuth2RefreshToken = tokenResp.RefreshToken
	}

	return auth, nil
}
