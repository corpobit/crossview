# SSO Configuration Guide

Crossview supports **any OIDC (OpenID Connect) or SAML 2.0 provider** for Single Sign-On authentication.

## Quick Start

1. **Enable SSO** in `config/config.yaml`:
   ```yaml
   sso:
     enabled: true
   ```

2. **Configure your provider** (OIDC or SAML) - see examples below

3. **Restart your server**

4. **SSO login buttons** will appear on the login page

## OIDC Configuration

Works with any OpenID Connect provider (Auth0, Okta, Azure AD, Google, Keycloak, etc.)

```yaml
sso:
  enabled: true
  oidc:
    enabled: true
    issuer: https://your-provider.com/realms/your-realm  # OIDC discovery endpoint
    clientId: your-client-id
    clientSecret: your-client-secret
    callbackURL: http://localhost:3001/api/auth/oidc/callback
    scope: openid profile email
    
    # Optional: Custom attribute mappings
    usernameAttribute: preferred_username
    emailAttribute: email
    firstNameAttribute: given_name
    lastNameAttribute: family_name
```

### OIDC Provider Setup

1. **Create an OIDC client** in your provider
2. **Set the redirect URI** to: `http://localhost:3001/api/auth/oidc/callback`
3. **Copy the client ID and secret** to your config
4. **Use the issuer URL** (usually ends with `/realms/...` or `/oauth2/...`)

The implementation supports **OIDC Discovery** - if you provide the `issuer` URL, it will automatically discover the authorization, token, and userinfo endpoints.

## SAML Configuration

Works with any SAML 2.0 provider (Okta, Azure AD, OneLogin, ADFS, etc.)

```yaml
sso:
  enabled: true
  saml:
    enabled: true
    entryPoint: https://your-provider.com/saml/sso
    issuer: your-application-issuer-name
    callbackURL: http://localhost:3001/api/auth/saml/callback
    cert: |-
      -----BEGIN CERTIFICATE-----
      Your SAML certificate here
      -----END CERTIFICATE-----
    
    # Optional: Custom attribute mappings
    usernameAttribute: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name
    emailAttribute: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress
    firstNameAttribute: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname
    lastNameAttribute: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname
```

### SAML Provider Setup

1. **Create a SAML application** in your provider
2. **Set the ACS (Assertion Consumer Service) URL** to: `http://localhost:3001/api/auth/saml/callback`
3. **Set the Entity ID/Issuer** to match your `saml.issuer` value
4. **Download the SAML certificate** and add it to `saml.cert`
5. **Configure attribute mappings** if your provider uses different attribute names

## Provider-Specific Examples

### Auth0
```yaml
oidc:
  issuer: https://your-tenant.auth0.com/
  clientId: your-auth0-client-id
  clientSecret: your-auth0-client-secret
  callbackURL: http://localhost:3001/api/auth/oidc/callback
```

### Okta
```yaml
oidc:
  issuer: https://your-tenant.okta.com/oauth2/default
  clientId: your-okta-client-id
  clientSecret: your-okta-client-secret
  callbackURL: http://localhost:3001/api/auth/oidc/callback
```

### Azure AD
```yaml
oidc:
  issuer: https://login.microsoftonline.com/your-tenant-id/v2.0
  clientId: your-azure-app-id
  clientSecret: your-azure-app-secret
  callbackURL: http://localhost:3001/api/auth/oidc/callback
```

### Google
```yaml
oidc:
  issuer: https://accounts.google.com
  clientId: your-google-client-id
  clientSecret: your-google-client-secret
  callbackURL: http://localhost:3001/api/auth/oidc/callback
```

## Keycloak (Optional Example)

If you want to use Keycloak, see `keycloak/README.md` for Keycloak-specific setup instructions. The code itself is provider-agnostic.

## User Creation

When a user logs in via SSO for the first time:
- A user account is **automatically created** in Crossview
- The **first SSO user becomes an admin** (if no users exist)
- **Users with email addresses in the `SSO_INITIAL_ADMIN_USER_EMAILS` list** are created as admin users
- **Other SSO users** are created as regular users
- User attributes (email, name) are synced from the SSO provider

### Admin User Configuration

You can explicitly specify a list of email addresses that should automatically receive the **admin role** when logging in via SSO. This is useful for:
1. Ensuring specific users always have admin access.
2. Promoting existing users to admin.

Add the following environment variable to your `docker-compose.yml` or `.env` file:

```yaml
SSO_INITIAL_ADMIN_USER_EMAILS=admin@example.com,internal-audit@example.com
```

Or in `config/config.yaml`:

```yaml
sso:
  enabled: true
  initialAdminUserEmails: admin@example.com,internal-audit@example.com
```

## Troubleshooting

- **Check server logs** for SSO initialization messages
- **Verify your provider's endpoints** are accessible
- **Ensure redirect URIs match** exactly (including http vs https)
- **Check client secret** is correct
- **Verify certificate format** for SAML (PEM format)

