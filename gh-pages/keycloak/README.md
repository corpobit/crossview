# Keycloak Setup (Optional)

This directory contains Keycloak-specific configuration files. **Keycloak is optional** - the SSO implementation works with any OIDC/SAML provider.

## Using Keycloak (Example Provider)

If you want to use Keycloak as your SSO provider, this directory contains:
- `import/crossview-realm.json` - Realm configuration for Keycloak
- Docker Compose configuration to auto-import the realm

### Quick Start with Keycloak

1. Start Keycloak:
   ```bash
   docker-compose up -d keycloak
   ```

2. Wait for Keycloak to start (about 30 seconds), then configure:

   **For OIDC:**
   ```bash
   node scripts/get-keycloak-secret.js
   ```

   **For SAML:**
   ```bash
   node scripts/get-keycloak-saml-cert.js
   ```

   **Or both:**
   ```bash
   node scripts/get-keycloak-secret.js
   node scripts/get-keycloak-saml-cert.js
   ```

3. Restart your server to load the configuration.

### Both OIDC and SAML

The realm is configured with both:
- **OIDC Client**: `crossview-client`
- **SAML Client**: `crossview-saml`

Both use the same realm and users. You can enable both in `config/config.yaml` to see both login options.

### Test User

A test user is included:
- **Username**: `testuser`
- **Password**: `test123`

## Using Other OIDC/SAML Providers

The SSO implementation is **provider-agnostic** and works with any OIDC or SAML provider. Simply configure your provider's details in `config/config.yaml`:

### For OIDC Providers:
```yaml
sso:
  enabled: true
  oidc:
    enabled: true
    issuer: https://your-provider.com/realms/your-realm
    clientId: your-client-id
    clientSecret: your-client-secret
    callbackURL: http://localhost:3001/api/auth/oidc/callback
    scope: openid profile email
```

### For SAML Providers:
```yaml
sso:
  enabled: true
  saml:
    enabled: true
    entryPoint: https://your-provider.com/saml/sso
    issuer: your-issuer-name
    callbackURL: http://localhost:3001/api/auth/saml/callback
    cert: |-
      -----BEGIN CERTIFICATE-----
      Your SAML certificate here
      -----END CERTIFICATE-----
```

### Supported Providers

The implementation works with:
- **OIDC**: Any OpenID Connect provider (Auth0, Okta, Azure AD, Google, Keycloak, etc.)
- **SAML**: Any SAML 2.0 provider (Okta, Azure AD, OneLogin, ADFS, etc.)

Just configure the appropriate endpoints and credentials for your provider.
