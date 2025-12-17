package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"crossview-go-server/lib"
	"crossview-go-server/models"
)

type SSOService struct {
	logger    lib.Logger
	env       lib.Env
	ssoConfig lib.SSOConfig
	userRepo  *models.UserRepository
}

func NewSSOService(logger lib.Logger, env lib.Env, db lib.Database) SSOServiceInterface {
	userRepo := models.NewUserRepository(db.DB)
	return SSOService{
		logger:    logger,
		env:       env,
		ssoConfig: lib.GetSSOConfig(env),
		userRepo:  userRepo,
	}
}

func (s SSOService) GetSSOStatus() lib.SSOConfig {
	return s.ssoConfig
}

func (s SSOService) InitiateOIDC(ctx context.Context, callbackURL string) (string, error) {
	if !s.ssoConfig.Enabled || !s.ssoConfig.OIDC.Enabled {
		return "", fmt.Errorf("OIDC SSO is not enabled")
	}
	
	oidcConfig := s.ssoConfig.OIDC
	
	// Use provided callback URL, fallback to config if not provided
	if callbackURL == "" {
		callbackURL = oidcConfig.CallbackURL
	}
	
	var authURL string
	var state string
	
	if oidcConfig.Issuer != "" {
		discoveryURL := strings.TrimSuffix(oidcConfig.Issuer, "/") + "/.well-known/openid-configuration"
		
		resp, err := http.Get(discoveryURL)
		if err == nil {
			defer resp.Body.Close()
			var discovery struct {
				AuthorizationEndpoint string `json:"authorization_endpoint"`
				TokenEndpoint         string `json:"token_endpoint"`
				UserInfoEndpoint      string `json:"userinfo_endpoint"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&discovery); err == nil {
				if discovery.AuthorizationEndpoint != "" {
					authURL = discovery.AuthorizationEndpoint
				}
			}
		}
	}
	
	if authURL == "" {
		if oidcConfig.AuthorizationURL != "" {
			authURL = oidcConfig.AuthorizationURL
		} else if oidcConfig.Issuer != "" {
			authURL = strings.TrimSuffix(oidcConfig.Issuer, "/") + "/protocol/openid-connect/auth"
		} else {
			return "", fmt.Errorf("OIDC authorization URL not configured")
		}
	}
	
	stateBytes := make([]byte, 32)
	rand.Read(stateBytes)
	state = base64.URLEncoding.EncodeToString(stateBytes)
	
	params := url.Values{}
	params.Set("client_id", oidcConfig.ClientId)
	params.Set("redirect_uri", callbackURL)
	params.Set("response_type", "code")
	params.Set("scope", oidcConfig.Scope)
	params.Set("state", state)
	
	authURL = authURL + "?" + params.Encode()
	
	return authURL, nil
}

func (s SSOService) HandleOIDCCallback(ctx context.Context, code, state string, callbackURL string) (*models.User, error) {
	if !s.ssoConfig.Enabled || !s.ssoConfig.OIDC.Enabled {
		return nil, fmt.Errorf("OIDC SSO is not enabled")
	}
	
	oidcConfig := s.ssoConfig.OIDC
	
	// Use provided callback URL, fallback to config if not provided
	if callbackURL == "" {
		callbackURL = oidcConfig.CallbackURL
	}
	
	var tokenURL string
	var userInfoURL string
	
	if oidcConfig.Issuer != "" {
		discoveryURL := strings.TrimSuffix(oidcConfig.Issuer, "/") + "/.well-known/openid-configuration"
		
		resp, err := http.Get(discoveryURL)
		if err == nil {
			defer resp.Body.Close()
			var discovery struct {
				TokenEndpoint    string `json:"token_endpoint"`
				UserInfoEndpoint string `json:"userinfo_endpoint"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&discovery); err == nil {
				if discovery.TokenEndpoint != "" {
					tokenURL = discovery.TokenEndpoint
				}
				if discovery.UserInfoEndpoint != "" {
					userInfoURL = discovery.UserInfoEndpoint
				}
			}
		}
	}
	
	if tokenURL == "" {
		if oidcConfig.TokenURL != "" {
			tokenURL = oidcConfig.TokenURL
		} else if oidcConfig.Issuer != "" {
			tokenURL = strings.TrimSuffix(oidcConfig.Issuer, "/") + "/protocol/openid-connect/token"
		} else {
			return nil, fmt.Errorf("OIDC token URL not configured")
		}
	}
	
	if userInfoURL == "" {
		if oidcConfig.UserInfoURL != "" {
			userInfoURL = oidcConfig.UserInfoURL
		} else if oidcConfig.Issuer != "" {
			userInfoURL = strings.TrimSuffix(oidcConfig.Issuer, "/") + "/protocol/openid-connect/userinfo"
		} else {
			return nil, fmt.Errorf("OIDC userinfo URL not configured")
		}
	}
	
	tokenData := url.Values{}
	tokenData.Set("grant_type", "authorization_code")
	tokenData.Set("code", code)
	tokenData.Set("redirect_uri", callbackURL)
	tokenData.Set("client_id", oidcConfig.ClientId)
	tokenData.Set("client_secret", oidcConfig.ClientSecret)
	
	tokenResp, err := http.PostForm(tokenURL, tokenData)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code for token: %w", err)
	}
	defer tokenResp.Body.Close()
	
	if tokenResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(tokenResp.Body)
		return nil, fmt.Errorf("token exchange failed: %s", string(body))
	}
	
	var tokenResult struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(tokenResp.Body).Decode(&tokenResult); err != nil {
		return nil, fmt.Errorf("failed to decode token response: %w", err)
	}
	
	req, err := http.NewRequest("GET", userInfoURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create userinfo request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+tokenResult.AccessToken)
	
	userInfoResp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch userinfo: %w", err)
	}
	defer userInfoResp.Body.Close()
	
	if userInfoResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(userInfoResp.Body)
		return nil, fmt.Errorf("userinfo request failed: %s", string(body))
	}
	
	var userInfo map[string]interface{}
	if err := json.NewDecoder(userInfoResp.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("failed to decode userinfo: %w", err)
	}
	
	username := getStringFromMap(userInfo, oidcConfig.UsernameAttribute, "preferred_username", "sub")
	email := getStringFromMap(userInfo, oidcConfig.EmailAttribute, "email")
	firstName := getStringFromMap(userInfo, oidcConfig.FirstNameAttribute, "given_name")
	lastName := getStringFromMap(userInfo, oidcConfig.LastNameAttribute, "family_name")
	providerId := getStringFromMap(userInfo, "sub", "")
	
	if username == "" && email == "" {
		return nil, fmt.Errorf("OIDC userinfo missing username and email")
	}
	
	user, err := s.userRepo.FindOrCreateSSOUser(username, email, firstName, lastName)
	if err != nil {
		return nil, fmt.Errorf("failed to find or create user: %w", err)
	}
	
	s.logger.Infof("OIDC user authenticated: userId=%d, username=%s, providerId=%s", user.ID, user.Username, providerId)
	
	return user, nil
}

func (s SSOService) InitiateSAML(ctx context.Context, callbackURL string) (string, error) {
	if !s.ssoConfig.Enabled || !s.ssoConfig.SAML.Enabled {
		return "", fmt.Errorf("SAML SSO is not enabled")
	}
	
	samlConfig := s.ssoConfig.SAML
	
	if samlConfig.EntryPoint == "" {
		return "", fmt.Errorf("SAML entry point not configured")
	}
	
	return samlConfig.EntryPoint, nil
}

func (s SSOService) HandleSAMLCallback(ctx context.Context, samlResponse string, callbackURL string) (*models.User, error) {
	if !s.ssoConfig.Enabled || !s.ssoConfig.SAML.Enabled {
		return nil, fmt.Errorf("SAML SSO is not enabled")
	}
	
	return nil, fmt.Errorf("SAML callback not yet implemented - requires SAML library")
}

func getStringFromMap(m map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		if val, ok := m[key]; ok {
			if str, ok := val.(string); ok && str != "" {
				return str
			}
		}
	}
	return ""
}

