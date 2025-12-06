# Crossview Helm Chart

This Helm chart deploys Crossview, a Kubernetes resource visualization and management platform, on a Kubernetes cluster.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- A Kubernetes cluster with appropriate RBAC permissions
- (Optional) Ingress controller if you want to use Ingress

## Installation

### Add the Helm repository

```bash
helm repo add crossview https://corpobit.github.io/crossview
helm repo update
```

### Install the chart

```bash
# Basic installation with default values
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
  --set image.tag=v0.9.0 \
  --set app.replicas=3 \
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
| `image.repository` | Docker image repository | `corpobit/crossview` |
| `image.tag` | Docker image tag | `latest` |
| `image.pullPolicy` | Image pull policy | `Always` |
| `app.replicas` | Number of replicas | `3` |
| `app.port` | Application port | `3001` |
| `service.type` | Service type | `LoadBalancer` |
| `service.port` | Service port | `80` |
| `ingress.enabled` | Enable Ingress | `false` |
| `ingress.className` | Ingress class name | `nginx` |
| `database.enabled` | Enable PostgreSQL database | `true` |
| `database.persistence.enabled` | Enable database persistence | `true` |
| `database.persistence.size` | Database PVC size | `10Gi` |
| `secrets.dbPassword` | Database password (required) | `""` |
| `secrets.sessionSecret` | Session secret (required) | `""` |
| `resources.requests.memory` | Memory request | `256Mi` |
| `resources.requests.cpu` | CPU request | `250m` |
| `resources.limits.memory` | Memory limit | `512Mi` |
| `resources.limits.cpu` | CPU limit | `500m` |

## Upgrading

```bash
helm upgrade crossview crossview/crossview \
  --namespace crossview \
  --set image.tag=v0.10.0 \
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
  --set env.DB_HOST=your-external-db-host \
  --set env.DB_PORT=5432 \
  --set secrets.dbPassword=your-db-password \
  --set secrets.sessionSecret=$(openssl rand -base64 32)
```

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
- Database password and session secret are required for installation
- The session secret should be a secure random string (use `openssl rand -base64 32`)
- RBAC resources (ClusterRole and ClusterRoleBinding) are created automatically
- The service account is created with the necessary permissions to read Kubernetes resources

## Support

For issues and questions, please visit: https://github.com/corpobit/crossview

