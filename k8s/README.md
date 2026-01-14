# Kubernetes Deployment Manifests

This directory contains Kubernetes manifests for deploying Crossview to a Kubernetes cluster.

## Quick Start

### 1. Create the Secret

First, create the secret with your database password and session secret:

```bash
# Copy the example secret
cp secret.yaml.example secret.yaml

# Edit secret.yaml with your values
# Generate a secure session secret:
openssl rand -base64 32

# Apply the secret
kubectl apply -f secret.yaml
```

### 2. Update Docker Image (Optional)

The default image uses GHCR: `ghcr.io/corpobit/crossview:latest`

To use Docker Hub instead, edit `deployment.yaml`:

```yaml
image: corpobit/crossview:latest
```

### 3. Deploy Everything

Deploy all resources in order:

```bash
# 1. Create namespace
kubectl apply -f namespace.yaml

# 2. Create ConfigMap
kubectl apply -f configmap.yaml

# 3. Create Secret (after editing secret.yaml.example)
kubectl apply -f secret.yaml

# 4. Create ServiceAccount
kubectl apply -f serviceaccount.yaml

# 5. Create RBAC (ClusterRole and ClusterRoleBinding)
kubectl apply -f clusterrole.yaml
kubectl apply -f clusterrolebinding.yaml

# 6. Deploy PostgreSQL
kubectl apply -f postgres-deployment.yaml

# 7. Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod -l app=crossview-postgres -n crossview --timeout=300s

# 8. Deploy Crossview application
kubectl apply -f deployment.yaml

# 9. Create Service
kubectl apply -f service.yaml

# 10. (Optional) Create Ingress
kubectl apply -f ingress.yaml
```

### Or deploy all at once:

```bash
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml  # After editing
kubectl apply -f serviceaccount.yaml
kubectl apply -f clusterrole.yaml
kubectl apply -f clusterrolebinding.yaml
kubectl apply -f postgres-deployment.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml  # Optional
```

## File Structure

- `namespace.yaml` - Creates the `crossview` namespace
- `configmap.yaml` - Non-sensitive configuration
- `secret.yaml.example` - Template for secrets (copy to `secret.yaml` and edit)
- `serviceaccount.yaml` - Service account for the application
- `clusterrole.yaml` - RBAC permissions (read-only access to cluster resources)
- `clusterrolebinding.yaml` - Binds service account to cluster role
- `postgres-deployment.yaml` - PostgreSQL database with PVC
- `deployment.yaml` - Main application deployment (3 replicas)
- `service.yaml` - LoadBalancer service to expose the application
- `ingress.yaml` - Ingress for external access (optional, requires ingress controller)

## Configuration

### Environment Variables

The application uses:
- **ConfigMap** for non-sensitive config (DB_HOST, DB_PORT, etc.)
- **Secret** for sensitive data (DB_PASSWORD, SESSION_SECRET)

### Scaling

The deployment is configured with:
- **3 replicas** by default
- **Pod anti-affinity** to spread pods across nodes
- **Rolling updates** with zero downtime

To scale:

```bash
kubectl scale deployment crossview -n crossview --replicas=5
```

### Database

PostgreSQL is deployed as a separate deployment with:
- Persistent volume (10Gi)
- Single replica (for production, consider using a managed database service)

### Kubernetes Access

The application automatically detects it's running in a pod and uses the service account token to access the Kubernetes API. No kubeconfig file needed!

## Accessing the Application

### Using LoadBalancer Service

```bash
# Get the external IP
kubectl get svc crossview-service -n crossview

# Access via the external IP
curl http://<EXTERNAL_IP>
```

### Using Ingress

1. Install an ingress controller (e.g., NGINX Ingress):
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
   ```

2. Update `ingress.yaml` with your domain name

3. Apply the ingress:
   ```bash
   kubectl apply -f ingress.yaml
   ```

4. Access via your domain (or add to `/etc/hosts` for testing)

## Monitoring

Check pod status:

```bash
kubectl get pods -n crossview
kubectl logs -f deployment/crossview -n crossview
```

Check service:

```bash
kubectl get svc -n crossview
```

## Troubleshooting

### Pods not starting

```bash
# Check pod events
kubectl describe pod <pod-name> -n crossview

# Check logs
kubectl logs <pod-name> -n crossview
```

### Database connection issues

```bash
# Check PostgreSQL pod
kubectl logs -f deployment/crossview-postgres -n crossview

# Test connection from app pod
kubectl exec -it deployment/crossview -n crossview -- env | grep DB_
```

### RBAC issues

```bash
# Check service account
kubectl get sa crossview-sa -n crossview

# Test permissions
kubectl auth can-i get pods --as=system:serviceaccount:crossview:crossview-sa -n crossview
```

## Production Considerations

1. **Use managed database**: Consider using a managed PostgreSQL service instead of deploying it in-cluster
2. **External secrets**: Use a secrets management solution (e.g., External Secrets Operator, Sealed Secrets)
3. **Resource limits**: Adjust resource requests/limits based on your workload
4. **Monitoring**: Add Prometheus metrics and Grafana dashboards
5. **Logging**: Set up centralized logging (e.g., ELK, Loki)
6. **Backup**: Configure database backups
7. **HTTPS**: Use cert-manager for automatic TLS certificates
8. **Network policies**: Add network policies for security

## Updating the Application

```bash
# Update the image (GHCR - default)
kubectl set image deployment/crossview crossview=ghcr.io/corpobit/crossview:v0.1.0 -n crossview

# Or use Docker Hub (fallback)
kubectl set image deployment/crossview crossview=corpobit/crossview:v0.1.0 -n crossview

# Or edit the deployment
kubectl edit deployment crossview -n crossview
```

## Cleanup

To remove everything:

```bash
kubectl delete -f ingress.yaml
kubectl delete -f service.yaml
kubectl delete -f deployment.yaml
kubectl delete -f postgres-deployment.yaml
kubectl delete -f clusterrolebinding.yaml
kubectl delete -f clusterrole.yaml
kubectl delete -f serviceaccount.yaml
kubectl delete -f secret.yaml
kubectl delete -f configmap.yaml
kubectl delete -f namespace.yaml
```

Or delete the namespace (this removes everything):

```bash
kubectl delete namespace crossview
```

