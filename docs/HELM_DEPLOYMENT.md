# Helm Deployment Guide

Deploy Crossview using Helm for the easiest and most flexible installation.

## Prerequisites

- Kubernetes cluster (1.19+)
- Helm 3.0+
- kubectl configured

## Quick Install

```bash
# Add the Helm repository
helm repo add crossview https://corpobit.github.io/crossview
helm repo update

# Install Crossview
helm install crossview crossview/crossview \
  --namespace crossview \
  --create-namespace \
  --set secrets.dbPassword=your-secure-password \
  --set secrets.sessionSecret=$(openssl rand -base64 32)
```

## Installation Options

### Basic Installation

```bash
helm install crossview crossview/crossview \
  --namespace crossview \
  --create-namespace \
  --set secrets.dbPassword=your-password \
  --set secrets.sessionSecret=$(openssl rand -base64 32)
```

### With Custom Image Tag

```bash
helm install crossview crossview/crossview \
  --namespace crossview \
  --create-namespace \
  --set image.tag=v1.0.0 \
  --set secrets.dbPassword=your-password \
  --set secrets.sessionSecret=$(openssl rand -base64 32)
```

### With Ingress

```bash
helm install crossview crossview/crossview \
  --namespace crossview \
  --create-namespace \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=crossview.example.com \
  --set secrets.dbPassword=your-password \
  --set secrets.sessionSecret=$(openssl rand -base64 32)
```

### With External Database

```bash
helm install crossview crossview/crossview \
  --namespace crossview \
  --create-namespace \
  --set database.enabled=false \
  --set env.DB_HOST=your-db-host \
  --set env.DB_PORT=5432 \
  --set secrets.dbPassword=your-password \
  --set secrets.sessionSecret=$(openssl rand -base64 32)
```

### High Availability

```bash
helm install crossview crossview/crossview \
  --namespace crossview \
  --create-namespace \
  --set app.replicas=3 \
  --set secrets.dbPassword=your-password \
  --set secrets.sessionSecret=$(openssl rand -base64 32)
```

## Configuration Values

### Required Values

- `secrets.dbPassword` - Database password
- `secrets.sessionSecret` - Session encryption key (generate with `openssl rand -base64 32`)

### Common Values

| Parameter | Description | Default |
|-----------|-------------|---------|
| `image.repository` | Docker image repository | `corpobit/crossview` |
| `image.tag` | Docker image tag | `latest` |
| `app.replicas` | Number of replicas | `3` |
| `service.type` | Service type | `LoadBalancer` |
| `ingress.enabled` | Enable Ingress | `false` |
| `database.enabled` | Enable PostgreSQL | `true` |
| `database.persistence.size` | Database storage size | `10Gi` |

### Using Values File

Create `my-values.yaml`:

```yaml
image:
  tag: v1.0.0

app:
  replicas: 3

ingress:
  enabled: true
  hosts:
    - host: crossview.example.com
      paths:
        - path: /
          pathType: Prefix

secrets:
  dbPassword: your-password
  sessionSecret: your-session-secret
```

Install with values file:

```bash
helm install crossview crossview/crossview \
  --namespace crossview \
  --create-namespace \
  -f my-values.yaml
```

## Post-Installation

### Verify Installation

```bash
# Check pods
kubectl get pods -n crossview

# Check services
kubectl get svc -n crossview

# Check ingress (if enabled)
kubectl get ingress -n crossview
```

### Access the Dashboard

**LoadBalancer:**
```bash
kubectl get svc crossview-service -n crossview
# Use EXTERNAL-IP
```

**Ingress:**
- Access via configured hostname
- Ensure DNS points to your ingress controller

**Port Forward (for testing):**
```bash
kubectl port-forward -n crossview svc/crossview-service 3001:80
# Access at http://localhost:3001
```

## Upgrading

### Upgrade to New Version

```bash
# Update repository
helm repo update

# Upgrade
helm upgrade crossview crossview/crossview \
  --namespace crossview \
  --set image.tag=v1.0.0 \
  --set secrets.dbPassword=your-password \
  --set secrets.sessionSecret=your-session-secret
```

### View Upgrade History

```bash
helm history crossview -n crossview
```

### Rollback

```bash
# Rollback to previous version
helm rollback crossview -n crossview

# Rollback to specific revision
helm rollback crossview 2 -n crossview
```

## Uninstalling

```bash
helm uninstall crossview -n crossview
```

**Note:** This removes the application but keeps the database PVC. To remove everything:

```bash
# Uninstall
helm uninstall crossview -n crossview

# Delete PVC (if you want to remove data)
kubectl delete pvc crossview-postgres-pvc -n crossview

# Delete namespace
kubectl delete namespace crossview
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod -n crossview -l app=crossview

# Check logs
kubectl logs -n crossview -l app=crossview
```

### Database Connection Issues

```bash
# Check database pod
kubectl get pods -n crossview -l app=crossview-postgres

# Check database logs
kubectl logs -n crossview -l app=crossview-postgres

# Verify ConfigMap
kubectl get configmap -n crossview crossview-config -o yaml
```

### Service Not Accessible

```bash
# Check service
kubectl get svc -n crossview

# Check endpoints
kubectl get endpoints -n crossview

# Test connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -- wget -O- http://crossview-service:80
```

For more help, see [Troubleshooting Guide](TROUBLESHOOTING.md).

## Advanced Configuration

See the [Helm Chart README](../helm/crossview/README.md) for complete configuration options.

