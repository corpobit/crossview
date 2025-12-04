# Troubleshooting Guide

Common issues and solutions when using Crossview.

## Installation Issues

### Pods Not Starting

**Symptoms:** Pods stuck in `Pending`, `CrashLoopBackOff`, or `Error` state

**Solutions:**
```bash
# Check pod status
kubectl describe pod -n crossview <pod-name>

# Check logs
kubectl logs -n crossview <pod-name>

# Common causes:
# - Insufficient resources (CPU/memory)
# - Image pull errors
# - Configuration errors
```

### Database Connection Failed

**Symptoms:** 
- Error: `getaddrinfo ENOTFOUND crossview-postgres`
- Error: `Connection refused`
- Pods restarting

**Solutions:**
```bash
# Verify database pod is running
kubectl get pods -n crossview -l app=crossview-postgres

# Check database logs
kubectl logs -n crossview -l app=crossview-postgres

# Verify ConfigMap has correct DB_HOST
kubectl get configmap -n crossview crossview-config -o yaml | grep DB_HOST

# For Helm: Ensure DB_HOST matches service name
# Default: crossview-postgres (or crossview-<release-name>-postgres)
```

### Service Account Permissions

**Symptoms:**
- Error: `Forbidden` when accessing resources
- Empty resource lists
- "Access denied" errors

**Solutions:**
```bash
# Verify service account exists
kubectl get serviceaccount -n crossview

# Check ClusterRoleBinding
kubectl get clusterrolebinding | grep crossview

# Test permissions
kubectl auth can-i get pods --as=system:serviceaccount:crossview:crossview-sa

# Verify ClusterRole
kubectl get clusterrole crossview-role -o yaml
```

## Configuration Issues

### Wrong Database Host

**Symptoms:** Cannot connect to database

**Fix:**
```bash
# For Helm
helm upgrade crossview crossview/crossview \
  --set env.DB_HOST=correct-host-name \
  -n crossview

# For Kubernetes
kubectl edit configmap crossview-config -n crossview
# Update DB_HOST value
```

### Missing Secrets

**Symptoms:** Application fails to start, secret errors

**Fix:**
```bash
# Create missing secrets
kubectl create secret generic crossview-secrets \
  --from-literal=db-password=your-password \
  --from-literal=session-secret=$(openssl rand -base64 32) \
  -n crossview
```

## Access Issues

### Cannot Access Dashboard

**LoadBalancer:**
```bash
# Check service
kubectl get svc -n crossview

# If EXTERNAL-IP is pending:
# - Wait for cloud provider to assign IP
# - Check LoadBalancer controller logs
# - Verify service type is LoadBalancer
```

**Ingress:**
```bash
# Check ingress
kubectl get ingress -n crossview

# Verify ingress controller is running
kubectl get pods -n ingress-nginx  # or your ingress namespace

# Check ingress annotations
kubectl describe ingress -n crossview crossview-ingress
```

**Port Forward:**
```bash
# Use port forwarding for testing
kubectl port-forward -n crossview svc/crossview-service 3001:80
```

### SSL/TLS Issues

**Symptoms:** Mixed content warnings, insecure connections

**Solutions:**
- Ensure ingress has TLS configured
- Use cert-manager for automatic certificates
- Set `session.secure: true` in config for HTTPS

## Resource Access Issues

### No Resources Showing

**Symptoms:** Dashboard shows empty lists

**Solutions:**
```bash
# Verify RBAC permissions
kubectl auth can-i list pods --as=system:serviceaccount:crossview:crossview-sa

# Check if resources exist
kubectl get all --all-namespaces

# Verify service account is used
kubectl get deployment -n crossview crossview -o yaml | grep serviceAccountName

# Check application logs for errors
kubectl logs -n crossview -l app=crossview | grep -i error
```

### Context Not Found

**Symptoms:** "Context parameter is required" error

**Solutions:**
- When running in-cluster: This shouldn't happen (auto-detected)
- When running locally: Provide context parameter or set KUBECONFIG
- Check if running in correct namespace

## Performance Issues

### Slow Loading

**Symptoms:** Dashboard takes long to load resources

**Solutions:**
- Increase resource limits
- Check database performance
- Verify network connectivity
- Consider pagination for large resource sets

### High Memory Usage

**Solutions:**
```bash
# Adjust resource limits in deployment
kubectl edit deployment -n crossview crossview

# Or in Helm values
resources:
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

## Database Issues

### Database Pod Not Starting

**Solutions:**
```bash
# Check PVC
kubectl get pvc -n crossview

# Check storage class
kubectl get storageclass

# Verify disk space
kubectl describe pod -n crossview -l app=crossview-postgres
```

### Database Migration Issues

**Solutions:**
- Database schema is created automatically
- Check application logs for migration errors
- Ensure database user has CREATE privileges

## SSO Issues

### OIDC Not Working

**Symptoms:** SSO login fails, redirect errors

**Solutions:**
- Verify callback URL matches provider configuration
- Check client ID and secret
- Verify issuer URL is correct
- Check application logs for OIDC errors

### SAML Not Working

**Solutions:**
- Verify certificate is valid
- Check SAML response format
- Verify entry point URL
- Check application logs for SAML errors

See [SSO Setup Guide](SSO_SETUP.md) for detailed SSO troubleshooting.

## Getting Help

### Check Logs

```bash
# Application logs
kubectl logs -n crossview -l app=crossview --tail=100

# Database logs
kubectl logs -n crossview -l app=crossview-postgres --tail=100

# Previous container logs (if crashed)
kubectl logs -n crossview -l app=crossview --previous
```

### Collect Information

When reporting issues, include:
- Kubernetes version: `kubectl version`
- Helm version: `helm version`
- Pod status: `kubectl get pods -n crossview`
- Relevant logs (see above)
- Configuration (redact secrets)

### Community Support

- GitHub Issues: https://github.com/corpobit/crossview/issues
- Check existing issues for similar problems
- Provide detailed information when creating new issues

