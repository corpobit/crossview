# Crossview Helm Chart

This Helm chart deploys Crossview, a Crossplane resource visualization and management platform, on a Kubernetes cluster.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- A Kubernetes cluster with appropriate RBAC permissions
- (Optional) Ingress controller if you want to use Ingress

## Recent Updates

- Updated PostgreSQL image to latest version (PostgreSQL 18 compatible)
- Fixed PostgreSQL volume mount path for PostgreSQL 18 compatibility
- Improved chart version synchronization in CI/CD pipeline
- Enhanced OCI registry integration

## Installation

### Option 1: Install from OCI Registry (Recommended)

Install directly from GHCR OCI registry. No repository setup needed!

```bash
# Install from GHCR OCI registry (recommended)
helm install crossview oci://ghcr.io/corpobit/crossview-chart \
  --version 3.0.0 \
  --namespace crossview \
  --create-namespace \
  --set secrets.dbPassword=your-db-password \
  --set secrets.sessionSecret=$(openssl rand -base64 32)
```

Alternatively, install from Docker Hub OCI registry (fallback):

```bash
# Install from Docker Hub OCI registry
helm install crossview oci://docker.io/corpobit/crossview-chart \
  --version 3.0.0 \
  --namespace crossview \
  --create-namespace \
  --set secrets.dbPassword=your-db-password \
  --set secrets.sessionSecret=$(openssl rand -base64 32)
```

### Option 2: Install from Helm Repository

```bash
# Add the Helm repository
helm repo add crossview https://corpobit.github.io/crossview
helm repo update

# Install the chart
helm install crossview crossview/crossview \
  --namespace crossview \
  --create-namespace \
  --set secrets.dbPassword=your-db-password \
  --set secrets.sessionSecret=$(openssl rand -base64 32)
```

### Install with custom values

```bash
helm install crossview crossview/crossview \
  --namespace crossview \
  --create-namespace \
  --set image.tag=3.0.0 \
  --set app.replicas=1 \
  --set secrets.dbPassword=your-db-password \
  --set secrets.sessionSecret=$(openssl rand -base64 32) \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=crossview.example.com
```

### Install from local chart

```bash
helm install crossview ./helm/crossview \
  --namespace crossview \
  --create-namespace \
  --set secrets.dbPassword=your-db-password \
  --set secrets.sessionSecret=$(openssl rand -base64 32)
```

## Configuration

The following table lists the configurable parameters and their default values:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | Docker image repository | `ghcr.io/corpobit/crossview` |
| `image.tag` | Docker image tag | `latest` |
| `image.pullPolicy` | Image pull policy | `Always` |
| `app.replicas` | Number of replicas | `1` |
| `app.port` | Application port | `3001` |
| `service.type` | Service type | `LoadBalancer` |
| `service.port` | Service port | `80` |
| `ingress.enabled` | Enable Ingress | `false` |
| `ingress.className` | Ingress class name | `nginx` |
| `config.ref` | Reference to existing ConfigMap with environment variables (if set, ConfigMap creation is skipped) | `""` |
| `config.database` | Database configuration (host, port, database, username) | See values.yaml |
| `config.server` | Server configuration (port, log, cors, auth, session) | See values.yaml |
| `config.server.auth.mode` | Authentication mode: `session`, `header`, or `none` | `session` |
| `config.server.auth.header.trustedHeader` | Header name for header auth (e.g. `X-Auth-User`) | `X-Auth-User` |
| `config.server.auth.header.createUsers` | Create users from header when missing (header mode) | `true` |
| `config.server.auth.header.defaultRole` | Default role for header-authenticated users | `viewer` |
| `config.sso` | SSO configuration (OIDC, SAML) | See values.yaml |
| `config.vite` | Vite/development server configuration | See values.yaml |
| `database.enabled` | Enable PostgreSQL database | `true` |
| `database.image.repository` | PostgreSQL image repository | `postgres` |
| `database.image.tag` | PostgreSQL image tag | `latest` (PostgreSQL 18) |
| `database.persistence.enabled` | Enable database persistence | `true` |
| `database.persistence.size` | Database PVC size | `10Gi` |
| `database.persistence.accessMode` | Database PVC access mode | `ReadWriteOnce` |
| `secrets.dbPassword` | Database password (required) | `""` |
| `secrets.sessionSecret` | Session secret (required) | `""` |
| `secrets.existingSecret` | Reference to existing Secret (if set, Secret creation is skipped) | `""` |
| `resources.requests.memory` | Memory request | `256Mi` |
| `resources.requests.cpu` | CPU request | `250m` |
| `resources.limits.memory` | Memory limit | `1Gi` |
| `resources.limits.cpu` | CPU limit | `1000m` |

## Upgrading

```bash
helm upgrade crossview crossview/crossview \
  --namespace crossview \
  --set image.tag=3.0.0 \
  --set secrets.dbPassword=your-db-password \
  --set secrets.sessionSecret=your-session-secret
```

## Uninstalling

```bash
helm uninstall crossview --namespace crossview
```

## Using External Database

If you want to use an external database instead of the included PostgreSQL:

```bash
helm install crossview crossview/crossview \
  --namespace crossview \
  --create-namespace \
  --set database.enabled=false \
  --set config.database.host=your-external-db-host \
  --set config.database.port=5432 \
  --set secrets.dbPassword=your-db-password \
  --set secrets.sessionSecret=$(openssl rand -base64 32)
```

## Configuration

The Helm chart supports two configuration methods:

### Method 1: Chart-Generated ConfigMap (Default)

If `config.ref` is not set, the chart generates a ConfigMap with environment variables from the `config` section in `values.yaml`. The configuration structure matches `config.yaml.example`:

```yaml
config:
  database:
    host: ""  # Empty = auto-detect: {release-name}-postgres
    port: 5432
    database: crossview
    username: postgres
  server:
    port: 3001
    log:
      level: info
    cors:
      origin: http://localhost:5173
      credentials: true
    session:
      cookie:
        secure: false
        httpOnly: true
        maxAge: 86400000
  sso:
    enabled: false
    oidc:
      enabled: false
      issuer: http://localhost:8080/realms/crossview
      clientId: crossview-client
      # ... other OIDC settings
    saml:
      enabled: false
      entryPoint: http://localhost:8080/realms/crossview/protocol/saml
      # ... other SAML settings
```

The chart creates a ConfigMap with environment variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, PORT, LOG_LEVEL, CORS_ORIGIN, SSO_ENABLED, OIDC_*, SAML_*, etc.). These are injected into the application pods via `configMapKeyRef`. Sensitive values (database password, session secret) are provided via Secrets and injected as environment variables (`DB_PASS`, `SESSION_SECRET`).

### Method 2: Existing ConfigMap

If you want to use an existing ConfigMap that contains environment variables:

1. Create a ConfigMap with environment variables:
```bash
kubectl create configmap my-crossview-config \
  --from-literal=DB_HOST=crossview-postgres \
  --from-literal=DB_PORT=5432 \
  --from-literal=DB_NAME=crossview \
  --from-literal=DB_USER=postgres \
  --from-literal=PORT=3001 \
  --from-literal=LOG_LEVEL=info \
  --from-literal=CORS_ORIGIN=http://localhost:5173 \
  --from-literal=SSO_ENABLED=false \
  --from-literal=OIDC_ENABLED=false \
  --from-literal=OIDC_ISSUER=http://localhost:8080/realms/crossview \
  --from-literal=OIDC_CLIENT_ID=crossview-client \
  --namespace crossview
```

2. Install the chart referencing the existing ConfigMap:
```bash
helm install crossview crossview/crossview \
  --namespace crossview \
  --create-namespace \
  --set config.ref=my-crossview-config \
  --set secrets.dbPassword=your-db-password \
  --set secrets.sessionSecret=$(openssl rand -base64 32)
```

**Notes:**
- When using `config.ref`, the ConfigMap must contain environment variables (DB_HOST, DB_PORT, etc.)
- The application reads configuration from environment variables (not from a file)
- Database password and session secret are provided via Secrets and injected as environment variables
- All configuration values use defaults from `values.yaml` if not provided in the config section

## Ingress Configuration

To enable Ingress with TLS:

```bash
helm install crossview crossview/crossview \
  --namespace crossview \
  --create-namespace \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=crossview.example.com \
  --set ingress.tls[0].secretName=crossview-tls \
  --set ingress.tls[0].hosts[0]=crossview.example.com \
  --set secrets.dbPassword=your-db-password \
  --set secrets.sessionSecret=$(openssl rand -base64 32)
```

## Notes

- The chart automatically creates a namespace if it doesn't exist (when using `--create-namespace`)
- For `config.server.auth.mode: session`, database password and session secret are required
- For `config.server.auth.mode: header` or `none`, the app does not use the database; you can set `database.enabled: false` and omit `secrets.dbPassword` (session secret is ignored when not in session mode)
- The session secret should be a secure random string (use `openssl rand -base64 32`) when using session mode

### Header auth (behind a proxy)

When Crossview is behind an authenticating reverse proxy (OAuth2 Proxy, Ingress with auth annotations, etc.) that sets the user identity in a header:

```bash
helm install crossview ./helm/crossview \
  --namespace crossview \
  --create-namespace \
  --set config.server.auth.mode=header \
  --set config.server.auth.header.trustedHeader=X-Auth-User \
  --set database.enabled=false
```

No database or session secret is required. Ensure the proxy sets the configured header (e.g. `X-Auth-User`) on every request.
- RBAC resources (ClusterRole and ClusterRoleBinding) are created automatically
- The service account is created with the necessary permissions to read Kubernetes resources
- PostgreSQL 18 compatibility: The chart uses the latest PostgreSQL image with updated volume mount paths for PostgreSQL 18
- When upgrading from older versions, ensure your database persistence volume is compatible with PostgreSQL 18

## Support

For issues and questions, please visit: https://github.com/corpobit/crossview

