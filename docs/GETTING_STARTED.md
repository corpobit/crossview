# Getting Started with Crossview

Crossview is a modern dashboard for managing and monitoring Crossplane resources in Kubernetes. This guide will help you get started quickly.

## What is Crossview?

Crossview provides a visual interface for:
- **Managing Crossplane Resources** - View, search, and manage your infrastructure-as-code
- **Monitoring Health** - Dashboard with real-time health metrics
- **Resource Discovery** - Advanced search and filtering capabilities
- **Multi-Context Support** - Manage resources across multiple Kubernetes clusters

## Quick Start

### Option 1: Helm (Recommended)

The easiest way to deploy Crossview is using Helm:

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

See [Helm Deployment Guide](HELM_DEPLOYMENT.md) for detailed instructions.

### Option 2: Kubernetes Manifests

Deploy using standard Kubernetes manifests:

```bash
# Create namespace
kubectl create namespace crossview

# Create secrets (edit values first)
kubectl create secret generic crossview-secrets \
  --from-literal=db-password=your-password \
  --from-literal=session-secret=$(openssl rand -base64 32) \
  -n crossview

# Apply manifests
kubectl apply -f k8s/
```

See [Kubernetes Deployment Guide](KUBERNETES_DEPLOYMENT.md) for complete instructions.

### Option 3: Docker

Run Crossview using Docker:

```bash
docker run -p 3001:3001 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_NAME=crossview \
  -e DB_USER=postgres \
  -e DB_PASSWORD=your-password \
  -e SESSION_SECRET=$(openssl rand -base64 32) \
  -v ~/.kube/config:/app/.kube/config:ro \
  corpobit/crossview:latest
```

## First Steps After Installation

1. **Access the Dashboard**
   - If using LoadBalancer: Check `kubectl get svc -n crossview` for EXTERNAL-IP
   - If using Ingress: Access via your configured domain
   - Default port: 3001

2. **Create Admin User**
   - First-time setup will prompt you to create an admin account
   - Or use the provided script: `scripts/make-admin.js`

3. **Connect to Kubernetes**
   - When running in-cluster: Automatically uses service account
   - When running locally: Ensure `~/.kube/config` is accessible

4. **Start Managing Resources**
   - Navigate to Dashboard to see overview
   - Use Search to find specific resources
   - Browse by resource type in the sidebar

## Next Steps

- [Configuration Guide](CONFIGURATION.md) - Learn how to configure Crossview
- [Features & Capabilities](FEATURES.md) - Explore what Crossview can do
- [SSO Setup](SSO_SETUP.md) - Configure Single Sign-On
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues and solutions

