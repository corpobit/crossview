#!/bin/bash

set -e

echo "🚀 Deploying Crossplane example resources..."

echo "📦 Step 1: Installing XRDs..."
kubectl apply -f xrds.yaml

echo "⏳ Waiting for XRDs to be established..."
kubectl wait --for condition=Established --timeout=60s crd/xnginxes.example.org crd/xredis.example.org crd/xpostgres.example.org crd/xwebapp.example.org || true

echo "📋 Step 2: Installing Compositions..."
kubectl apply -f compositions.yaml

echo "🎯 Step 3: Creating example Claims..."
kubectl apply -f claims.yaml

echo "✅ Deployment complete!"
echo ""
echo "📊 Check status with:"
echo "  kubectl get nginx,redis,postgres,webapp -A"
echo "  kubectl get xnginx,xredis,xpostgres,xwebapp -A"
echo "  kubectl get deployments,services -A | grep -E '(nginx|redis|postgres|webapp)'"

