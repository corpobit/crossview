# Kubernetes Deployment Guide

Deploy Crossview using standard Kubernetes manifests for full control over your deployment.

## Prerequisites

- Kubernetes cluster (1.19+)
- kubectl configured
- Access to create namespaces, deployments, services, and RBAC resources

## Quick Deployment

### 1. Create Namespace

```bash
kubectl create namespace crossview
```

### 2. Create Secrets

Create a secret with database password and session secret:

```bash
kubectl create secret generic crossview-secrets \
  --from-literal=db-password=your-secure-password \
  --from-literal=session-secret=$(openssl rand -base64 32) \
  -n crossview
```

### 3. Update Configuration

Edit `k8s/configmap.yaml` and `k8s/deployment.yaml` with your settings:

- Docker image defaults to `ghcr.io/corpobit/crossview:latest` (GHCR - recommended)
- To use Docker Hub instead, change to `corpobit/crossview:latest` in `deployment.yaml`
- Adjust resource limits if needed
- Configure database settings in `configmap.yaml`

### 4. Deploy Resources

```bash
# Apply all manifests
kubectl apply -f k8s/

# Or apply individually
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/serviceaccount.yaml
kubectl apply -f k8s/clusterrole.yaml
kubectl apply -f k8s/clusterrolebinding.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

## How It Works

When running inside a Kubernetes pod, Crossview automatically:
- Uses the service account token (no kubeconfig needed)
- Accesses the same cluster the pod is running in
- Uses RBAC permissions from the service account

## Quick Deployment

See the `k8s/` directory for ready-to-use Kubernetes manifests. Quick start:

```bash
# 1. Create secret (edit secret.yaml.example first)
cp k8s/secret.yaml.example k8s/secret.yaml
# Edit k8s/secret.yaml with your values
kubectl apply -f k8s/secret.yaml

# 2. (Optional) Update deployment.yaml if you want to use Docker Hub instead of GHCR
# Default image is ghcr.io/corpobit/crossview:latest (GHCR - recommended)

# 3. Deploy everything
kubectl apply -f k8s/
```

See `k8s/README.md` for detailed instructions.

### Manual Deployment Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crossview
  namespace: crossview
spec:
  replicas: 3  # Multiple instances for scalability
  selector:
    matchLabels:
      app: crossview
  template:
    metadata:
      labels:
        app: crossview
    spec:
      serviceAccountName: crossview-sa
      containers:
      - name: crossview
        image: ghcr.io/corpobit/crossview:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          value: "postgres-service"
        - name: DB_PORT
          value: "5432"
        - name: DB_NAME
          value: "crossview"
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: crossview-secrets
              key: db-user
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: crossview-secrets
              key: db-password
        - name: SESSION_SECRET
          valueFrom:
            secretKeyRef:
              name: crossview-secrets
              key: session-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: crossview-sa
  namespace: crossview
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: crossview-role
rules:
- apiGroups: [""]
  resources: ["*"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apiextensions.k8s.io"]
  resources: ["*"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: crossview-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: crossview-role
subjects:
- kind: ServiceAccount
  name: crossview-sa
  namespace: crossview
---
apiVersion: v1
kind: Service
metadata:
  name: crossview-service
  namespace: crossview
spec:
  selector:
    app: crossview
  ports:
  - port: 80
    targetPort: 3001
  type: LoadBalancer
```

### Important Notes

1. **Service Account Permissions:**
   - The service account needs RBAC permissions to read Kubernetes resources
   - The example above grants read-only access to all resources
   - Adjust permissions based on your security requirements

2. **Multiple Pods:**
   - All pods will access the **same Kubernetes cluster** they're running in
   - Sessions are shared via PostgreSQL (cluster-ready)
   - Load balancer distributes traffic across pods

3. **No Kubeconfig Needed:**
   - When running in a pod, the app automatically uses the service account
   - Don't mount `~/.kube/config` - it's not needed and won't work the same way

4. **Accessing Different Clusters:**
   - If you need to access a different cluster, you'd need to:
     - Mount that cluster's kubeconfig as a secret
     - Set `KUBECONFIG` env var to point to the mounted config
     - Or use the service account from that cluster

### Testing Locally vs. In Cluster

- **Local:** Uses `~/.kube/config` → Accesses your configured cluster
- **In Pod:** Uses service account → Accesses the cluster the pod is running in

Both methods work automatically - the code detects the environment!

