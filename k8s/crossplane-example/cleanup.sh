#!/bin/bash

set -e

echo "🧹 Cleaning up Crossplane example resources..."

echo "🗑️  Removing Claims..."
kubectl delete -f claims.yaml --ignore-not-found=true || true

echo "🗑️  Removing Compositions..."
kubectl delete -f compositions.yaml --ignore-not-found=true || true

echo "🗑️  Removing XRDs..."
kubectl delete -f xrds.yaml --ignore-not-found=true || true

echo "✅ Cleanup complete!"

