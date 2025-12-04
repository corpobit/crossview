# GitHub Pages 404 Troubleshooting

If you're getting a 404 error at `https://corpobit.github.io/crossview`, check the following:

## 1. Repository Visibility

**If your repository is PRIVATE:**
- GitHub Pages for private repositories requires **GitHub Pro, Team, or Enterprise**
- If you don't have a paid plan, you need to make the repository public
- Go to: Settings → General → Danger Zone → Change repository visibility

## 2. GitHub Pages Settings

Verify Pages is configured correctly:

1. Go to **Settings** → **Pages**
2. Check that:
   - **Source**: `Deploy from a branch`
   - **Branch**: `gh-pages`
   - **Folder**: `/ (root)`
3. You should see a green checkmark and a message like "Your site is published at..."

## 3. Wait for Build

GitHub Pages can take **5-10 minutes** to build after:
- First enabling Pages
- Pushing to the `gh-pages` branch
- Making changes to the branch

## 4. Check the gh-pages Branch

Verify the branch has the correct structure:

```bash
git checkout gh-pages
ls -la
```

You should see:
- `index.yaml` (Helm repository index)
- `charts/` directory (may be empty until first chart is published)
- `README.md` (optional, for visibility)

## 5. Test Direct Access

Try accessing these URLs directly:

- `https://corpobit.github.io/crossview/index.yaml` - Should show the Helm index
- `https://corpobit.github.io/crossview/README.md` - Should show the README
- `https://corpobit.github.io/crossview/charts/` - Should list chart packages (may be empty)

## 6. Check GitHub Actions

1. Go to the **Actions** tab
2. Look for the "Helm Chart Release" workflow
3. Check if it completed successfully
4. If it failed, check the logs

## 7. Manual Test

You can test if the Helm repository works even if the web page shows 404:

```bash
# Add the repository
helm repo add crossview https://corpobit.github.io/crossview

# Update
helm repo update

# Search (will show charts if any are published)
helm search repo crossview
```

If `helm repo add` works, the repository is accessible even if the web page shows 404.

## 8. Common Issues

### Issue: "404 File not found"
- **Cause**: Pages hasn't built yet, or repository is private without paid plan
- **Solution**: Wait 5-10 minutes, or make repository public

### Issue: "Repository not found"
- **Cause**: Wrong URL or repository doesn't exist
- **Solution**: Verify the URL is `https://corpobit.github.io/crossview`

### Issue: "Empty repository"
- **Cause**: `gh-pages` branch is empty or doesn't exist
- **Solution**: Ensure `gh-pages` branch exists and has `index.yaml`

## 9. Verify Pages Deployment

1. Go to **Settings** → **Pages**
2. Scroll down to see deployment history
3. You should see recent deployments from the `gh-pages` branch
4. If there are no deployments, Pages might not be enabled

## 10. Force Rebuild

To force GitHub Pages to rebuild:

1. Make a small change to the `gh-pages` branch (e.g., update README)
2. Commit and push
3. Wait 5-10 minutes
4. Check again

## Still Not Working?

If none of the above works:

1. Check if you have GitHub Pro/Team/Enterprise (for private repos)
2. Verify the repository name is exactly `crossview` (case-sensitive)
3. Check the organization name is exactly `corpobit` (case-sensitive)
4. Try accessing from an incognito/private browser window
5. Clear browser cache

The Helm repository should work even if the main page shows 404, as long as `index.yaml` is accessible at `https://corpobit.github.io/crossview/index.yaml`.

