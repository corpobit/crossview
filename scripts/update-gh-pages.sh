#!/bin/bash
# Script to update GitHub Pages directly without triggering release workflow
# This updates only the index.html file with light mode styling

set -e

echo "🔄 Updating GitHub Pages with light mode..."

# Checkout gh-pages branch
git fetch origin gh-pages:gh-pages 2>/dev/null || true
git checkout gh-pages 2>/dev/null || git checkout -b gh-pages

# Pull latest changes
git pull origin gh-pages --rebase 2>/dev/null || true

# The HTML will be updated by the release workflow next time it runs
# For now, you can manually update index.html if needed
echo "✅ On gh-pages branch"
echo ""
echo "To update the HTML, you can:"
echo "1. Wait for the next release workflow to run (it will use the updated template)"
echo "2. Or manually edit index.html and commit it"
echo ""
echo "Current branch: $(git branch --show-current)"
echo ""
echo "To push changes:"
echo "  git add index.html"
echo "  git commit -m 'Update to light mode'"
echo "  git push origin gh-pages"

