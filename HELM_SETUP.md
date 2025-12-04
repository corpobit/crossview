# Helm Chart Setup Guide

This guide explains how to set up and use the Helm chart repository hosted on GitHub Pages.

## Prerequisites

1. A GitHub repository (this repository)
2. GitHub Actions enabled
3. GitHub Pages enabled in repository settings

## Private vs Public Repository

**Important:** GitHub Pages for private repositories requires a **GitHub Pro, Team, or Enterprise** plan.

### If your repository is private:
- ✅ **You can use GitHub Pages** if you have GitHub Pro/Team/Enterprise
- ✅ The Helm chart repository will work the same way
- ✅ The `gh-pages` branch can remain private (only accessible to those with repo access)

### If your repository is public:
- ✅ **GitHub Pages is free** for public repositories
- ✅ The Helm chart repository will be publicly accessible
- ✅ Anyone can add your Helm repo and install your charts

### Recommendation:
- **For internal/private use:** Keep the repo private if you have GitHub Pro/Team/Enterprise
- **For public/open-source:** Make the repo public to enable free GitHub Pages

**Note:** The Helm chart repository URL (`https://corpobit.github.io/crossview`) will work the same way regardless of whether the main repository is private or public, as long as GitHub Pages is enabled.

## Initial Setup

### 1. Enable GitHub Pages

1. Go to your repository settings on GitHub
2. Navigate to **Pages** in the left sidebar
3. Under **Source**, select:
   - **Source**: `Deploy from a branch`
   - **Branch**: `gh-pages`
   - **Folder**: `/ (root)`
4. Click **Save**

### 2. Create the gh-pages Branch

The GitHub Actions workflow will automatically create the `gh-pages` branch on the first run, but you can also create it manually:

```bash
# Create an orphan branch (no history)
git checkout --orphan gh-pages

# Remove all files
git rm -rf .

# Create initial index.yaml (empty)
echo "apiVersion: v1
entries: {}" > index.yaml

# Commit and push
git add index.yaml
git commit -m "Initial Helm chart repository"
git push origin gh-pages

# Switch back to main
git checkout main
```

### 3. Verify GitHub Actions Permissions

Ensure that GitHub Actions has the necessary permissions:

1. Go to **Settings** → **Actions** → **General**
2. Under **Workflow permissions**, select:
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**

## How It Works

### Automatic Updates

The Helm chart is automatically updated when:

1. **Code is pushed to main branch** - If Helm chart files or `package.json` change
2. **A GitHub Release is published** - The chart version matches the release version
3. **The release workflow completes** - Triggers Helm chart update with the new version

### Workflow Process

1. The `helm-release.yml` workflow runs
2. It calculates or retrieves the chart version
3. Updates `Chart.yaml` with the new version
4. Packages the Helm chart into a `.tgz` file
5. Checks out the `gh-pages` branch
6. Copies the new chart package to `gh-pages/charts/`
7. Updates the `index.yaml` file with Helm's `repo index` command
8. Commits and pushes to `gh-pages` branch
9. Deploys to GitHub Pages

## Using the Helm Chart Repository

### Add the Repository

```bash
helm repo add crossview https://corpobit.github.io/crossview
helm repo update
```

### Install from the Repository

```bash
helm install crossview crossview/crossview \
  --namespace crossview \
  --create-namespace \
  --set secrets.dbPassword=your-db-password \
  --set secrets.sessionSecret=$(openssl rand -base64 32)
```

### List Available Versions

```bash
helm search repo crossview --versions
```

### Upgrade

```bash
helm upgrade crossview crossview/crossview \
  --namespace crossview \
  --set image.tag=v0.10.0 \
  --set secrets.dbPassword=your-db-password \
  --set secrets.sessionSecret=your-session-secret
```

## Manual Chart Update

If you need to manually trigger a Helm chart update:

1. Go to **Actions** tab in GitHub
2. Select **Helm Chart Release** workflow
3. Click **Run workflow**
4. Select the branch (usually `main`)
5. Click **Run workflow**

## Troubleshooting

### GitHub Pages Not Updating

1. Check the workflow run in the **Actions** tab
2. Verify the `gh-pages` branch exists and has content
3. Check GitHub Pages settings to ensure it's pointing to `gh-pages` branch
4. Wait a few minutes for GitHub Pages to rebuild

### Chart Not Found After Adding Repository

1. Verify the repository URL is correct
2. Run `helm repo update`
3. Check that `index.yaml` exists in the `gh-pages` branch
4. Verify the chart package (`.tgz` file) exists in `gh-pages/charts/`

### Workflow Fails

1. Check workflow logs in the **Actions** tab
2. Verify GitHub Actions has write permissions
3. Ensure the `gh-pages` branch exists
4. Check that Helm chart files are valid (run `helm lint helm/crossview`)

## Repository Structure

After setup, your `gh-pages` branch should have:

```
gh-pages/
├── charts/
│   ├── crossview-0.1.0.tgz
│   ├── crossview-0.2.0.tgz
│   └── ...
└── index.yaml
```

## Testing Locally

Before pushing, you can test the Helm chart locally:

```bash
# Lint the chart
helm lint helm/crossview

# Package the chart
helm package helm/crossview

# Test installation (dry-run)
helm install crossview-test ./helm/crossview --dry-run --debug

# Test with values
helm install crossview-test ./helm/crossview \
  --set secrets.dbPassword=test \
  --set secrets.sessionSecret=test \
  --dry-run --debug
```

## Version Management

- Chart version is automatically synced with application releases
- When a new release is created, the Helm chart version matches the release version
- The `appVersion` in `Chart.yaml` is also updated to match

## Security Notes

- Never commit secrets to the repository
- Use `--set` or `values.yaml` files (not committed) for sensitive data
- The Helm chart repository is public, so don't include sensitive information in `values.yaml`

## Additional Resources

- [Helm Documentation](https://helm.sh/docs/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

