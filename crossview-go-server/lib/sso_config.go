package lib

import (
	"fmt"
	"os"

	"github.com/spf13/viper"
)

type SSOConfig struct {
	Enabled bool
	OIDC    OIDCConfig
	SAML    SAMLConfig
}

type OIDCConfig struct {
	Enabled            bool
	Issuer             string
	ClientId           string
	ClientSecret       string
	AuthorizationURL   string
	TokenURL           string
	UserInfoURL        string
	CallbackURL        string
	Scope              string
	UsernameAttribute  string
	EmailAttribute     string
	FirstNameAttribute string
	LastNameAttribute  string
	RoleAttributePath  string
}

type SAMLConfig struct {
	Enabled            bool
	EntryPoint         string
	Issuer             string
	Cert               string
	CallbackURL        string
	UsernameAttribute  string
	EmailAttribute     string
	FirstNameAttribute string
	LastNameAttribute  string
}

func GetSSOConfig(env Env) SSOConfig {
	ssoEnabled := getEnvOrDefault("SSO_ENABLED", "")
	if ssoEnabled == "" {
		if viper.IsSet("sso.enabled") {
			ssoEnabled = fmt.Sprintf("%v", viper.Get("sso.enabled"))
		} else {
			ssoEnabled = "false"
		}
	}

	enabled := ssoEnabled == "true"

	return SSOConfig{
		Enabled: enabled,
		OIDC:    getOIDCConfig(env),
		SAML:    getSAMLConfig(env),
	}
}

func getOIDCConfig(env Env) OIDCConfig {
	oidcEnabled := getEnvOrDefault("OIDC_ENABLED", "")
	if oidcEnabled == "" {
		if viper.IsSet("sso.oidc.enabled") {
			oidcEnabled = fmt.Sprintf("%v", viper.Get("sso.oidc.enabled"))
		} else {
			oidcEnabled = "false"
		}
	}
	return OIDCConfig{
		Enabled:            oidcEnabled == "true",
		Issuer:             getEnvOrDefault("OIDC_ISSUER", getConfigValue("sso.oidc.issuer", "", "http://localhost:8080/realms/crossview")),
		ClientId:           getEnvOrDefault("OIDC_CLIENT_ID", getConfigValue("sso.oidc.clientId", "", "crossview-client")),
		ClientSecret:       getEnvOrDefault("OIDC_CLIENT_SECRET", getConfigValue("sso.oidc.clientSecret", "", "")),
		AuthorizationURL:   getEnvOrDefault("OIDC_AUTHORIZATION_URL", getConfigValue("sso.oidc.authorizationURL", "", "")),
		TokenURL:           getEnvOrDefault("OIDC_TOKEN_URL", getConfigValue("sso.oidc.tokenURL", "", "")),
		UserInfoURL:        getEnvOrDefault("OIDC_USERINFO_URL", getConfigValue("sso.oidc.userInfoURL", "", "")),
		CallbackURL:        getEnvOrDefault("OIDC_CALLBACK_URL", getConfigValue("sso.oidc.callbackURL", "", "http://localhost:3001/api/auth/oidc/callback")),
		Scope:              getEnvOrDefault("OIDC_SCOPE", getConfigValue("sso.oidc.scope", "", "openid profile email")),
		UsernameAttribute:  getEnvOrDefault("OIDC_USERNAME_ATTRIBUTE", getConfigValue("sso.oidc.usernameAttribute", "", "preferred_username")),
		EmailAttribute:     getEnvOrDefault("OIDC_EMAIL_ATTRIBUTE", getConfigValue("sso.oidc.emailAttribute", "", "email")),
		FirstNameAttribute: getEnvOrDefault("OIDC_FIRSTNAME_ATTRIBUTE", getConfigValue("sso.oidc.firstNameAttribute", "", "given_name")),
		LastNameAttribute:  getEnvOrDefault("OIDC_LASTNAME_ATTRIBUTE", getConfigValue("sso.oidc.lastNameAttribute", "", "family_name")),
		RoleAttributePath:  getEnvOrDefault("OIDC_ROLE_ATTRIBUTE_PATH", getConfigValue("sso.oidc.roleAttributePath", "", "")),
	}
}

func getSAMLConfig(env Env) SAMLConfig {
	samlEnabled := getEnvOrDefault("SAML_ENABLED", "")
	if samlEnabled == "" {
		if viper.IsSet("sso.saml.enabled") {
			samlEnabled = fmt.Sprintf("%v", viper.Get("sso.saml.enabled"))
		} else {
			samlEnabled = "false"
		}
	}

	cert := getEnvOrDefault("SAML_CERT", getConfigValue("sso.saml.cert", "", ""))
	if cert != "" {
		if _, err := os.Stat(cert); err == nil {
			if certBytes, err := os.ReadFile(cert); err == nil {
				cert = string(certBytes)
			}
		}
	}

	return SAMLConfig{
		Enabled:            samlEnabled == "true",
		EntryPoint:         getEnvOrDefault("SAML_ENTRY_POINT", getConfigValue("sso.saml.entryPoint", "", "http://localhost:8080/realms/crossview/protocol/saml")),
		Issuer:             getEnvOrDefault("SAML_ISSUER", getConfigValue("sso.saml.issuer", "", "crossview")),
		Cert:               cert,
		CallbackURL:        getEnvOrDefault("SAML_CALLBACK_URL", getConfigValue("sso.saml.callbackURL", "", "http://localhost:3001/api/auth/saml/callback")),
		UsernameAttribute:  getEnvOrDefault("SAML_USERNAME_ATTRIBUTE", getConfigValue("sso.saml.usernameAttribute", "", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name")),
		EmailAttribute:     getEnvOrDefault("SAML_EMAIL_ATTRIBUTE", getConfigValue("sso.saml.emailAttribute", "", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")),
		FirstNameAttribute: getEnvOrDefault("SAML_FIRSTNAME_ATTRIBUTE", getConfigValue("sso.saml.firstNameAttribute", "", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname")),
		LastNameAttribute:  getEnvOrDefault("SAML_LASTNAME_ATTRIBUTE", getConfigValue("sso.saml.lastNameAttribute", "", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname")),
	}
}
