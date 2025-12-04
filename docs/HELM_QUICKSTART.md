# Helm Chart Quick Start

## What Was Created

1. **Helm Chart** (`helm/crossview/`)
   - Complete Helm chart with all Kubernetes resources
   - Configurable via `values.yaml`
   - Includes: Deployment, Service, Ingress, ConfigMap, Secrets, RBAC, PostgreSQL

2. **GitHub Actions Workflow** (`.github/workflows/helm-release.yml`)
   - Automatically packages and publishes Helm charts to GitHub Pages
   - Triggers on code pushes, releases, and after the build workflow completes

3. **Documentation**
   - `helm/crossview/README.md` - Chart usage guide
   - `docs/HELM_SETUP.md` - Detailed setup instructions
   - Updated main `README.md` with Helm section

## Private Repository Note

**GitHub Pages for private repositories requires GitHub Pro/Team/Enterprise.**

- If you have GitHub Pro/Team/Enterprise: You can keep the repo private
- If you don't have a paid plan: You'll need to make the repo public to use GitHub Pages

The Helm chart will work the same way in both cases. The choice depends on whether you want the chart to be publicly accessible or only available to your organization.

## What You Need to Do

### 1. Enable GitHub Pages (One-time setup)

1. Go to your GitHub repository
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select:
   - **Source**: `Deploy from a branch`
   - **Branch**: `gh-pages`
   - **Folder**: `/ (root)`
4. Click **Save**

### 2. Create the gh-pages Branch (One-time setup)

The workflow will try to create it automatically, but you can create it manually:

```bash
git checkout --orphan gh-pages
git rm -rf .
echo "apiVersion: v1
entries: {}" > index.yaml
git add index.yaml
git commit -m "Initial Helm chart repository"
git push origin gh-pages
git checkout main
```

### 3. Verify GitHub Actions Permissions

1. Go to **Settings** → **Actions** → **General**
2. Under **Workflow permissions**, ensure:
   - ✅ **Read and write permissions** is selected
   - ✅ **Allow GitHub Actions to create and approve pull requests** is checked

## How It Works

### Automatic Flow

1. **You push code to main** → Build workflow runs → Creates release → Helm chart workflow runs → Updates Helm chart

2. **The Helm chart workflow will:**
   - Calculate or get the version from the release
   - Update `Chart.yaml` with the new version
   - Package the Helm chart
   - Update the `gh-pages` branch with the new chart
   - Deploy to GitHub Pages

### Using Your Helm Chart

Once the first chart is published, users can:

```bash
# Add your repository
helm repo add crossview https://corpobit.github.io/crossview
helm repo update

# Install
helm install crossview crossview/crossview \
  --namespace crossview \
  --create-namespace \
  --set secrets.dbPassword=your-password \
  --set secrets.sessionSecret=$(openssl rand -base64 32)
```

## Testing Locally

Before pushing, test your Helm chart:

```bash
# Lint
helm lint helm/crossview

# Dry-run install
helm install crossview-test ./helm/crossview \
  --set secrets.dbPassword=test \
  --set secrets.sessionSecret=test \
  --dry-run --debug
```

## Next Steps

1. ✅ Enable GitHub Pages (see above)
2. ✅ Create gh-pages branch (see above)
3. ✅ Push your code - the workflow will handle the rest!
4. ✅ Test the Helm chart installation

## Troubleshooting

- **Workflow fails**: Check Actions tab for error details
- **Chart not found**: Ensure `gh-pages` branch exists and has `index.yaml`
- **Pages not updating**: Wait a few minutes, GitHub Pages can take time to rebuild

For more details, see [HELM_SETUP.md](HELM_SETUP.md) in the docs folder.

