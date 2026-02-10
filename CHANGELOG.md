# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **Authentication modes**
  - **`session`** (existing): Username/password or SSO; identity stored in session (PostgreSQL).
  - **`header`**: Trust identity from an HTTP header set by an upstream proxy (e.g. OAuth2 Proxy, Ingress auth). No login form; no database required.
  - **`none`**: No authentication (development or trusted networks). All requests treated as anonymous; no database required.
- **Header auth configuration**
  - `server.auth.mode` (or `AUTH_MODE`): `session` | `header` | `none`.
  - `server.auth.header.trustedHeader` (default: `X-Auth-User`).
  - `server.auth.header.createUsers` (default: `true`).
  - `server.auth.header.defaultRole` (default: `viewer`).
- **Database optional for header/none**
  - When `auth.mode` is `header` or `none`, the app does not connect to the database; migrations and ping are skipped.
  - UserRepository is nil-safe when DB is not configured.
- **Helm chart**
  - `config.server.auth` and `config.server.auth.header.*` in values.
  - ConfigMap and deployment pass `AUTH_MODE`, `AUTH_TRUSTED_HEADER`, `AUTH_CREATE_USERS`, `AUTH_DEFAULT_ROLE`.
  - Default auth mode in the chart is `none`.
  - Header auth example and note that `database.enabled: false` is supported for header/none.
- **Frontend**
  - `/api/auth/check` returns `authMode`; UI uses it to hide logout in header/none and hide User Management in Settings when not in session mode.
- **Config examples**
  - `config/examples/config-header.yaml.example`, `config/examples/config-none.yaml.example`, `config/examples/config-session.yaml.example`, `config/examples/config-session-sso.yaml.example`.
- **Local nginx for header auth testing**
  - `nginx/crossview-header-auth.conf` (dev: Vite + backend) and `nginx/crossview-header-auth-single.conf` (e.g. `npm start`); README in `nginx/README.md`.
- **CI pipeline** (on branch with `ci.yaml`)
  - Runs on pull requests and pushes to `main` (with path filters).
  - Jobs: Frontend Lint, Frontend Build, Go Vet, Go Build, Go Tests.
  - Concurrency cancels in-progress runs for the same PR or branch.

### Changed

- **Session middleware**
  - Cookie/session store is only registered when `auth.mode` is `session`.
- **Auth middleware**
  - Single `AuthMiddleware` selects session, header, or no-auth handler from config; Kubernetes (and other) routes use it instead of session-only middleware.
- **RequireAdmin**
  - Resolves `userId` from context first, then session; returns Forbidden when `userId` is 0 (e.g. header/none).
- **Auth controller `Check`**
  - Supports header and none: returns synthetic user and `authMode`; session branch unchanged.
- **Documentation**
  - CONFIGURATION.md: "Authentication Modes" and DB only for session.
  - FEATURES.md: auth modes and header auth.
  - HELM_DEPLOYMENT.md: header auth (no DB) example and required values per mode.
  - Helm README: auth parameters and header auth example.

### Security

- Header mode is intended for use behind a trusted proxy that sets the identity header; document that direct exposure with header mode is insecure.
- None mode is for development or trusted environments only.
