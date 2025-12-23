#!/bin/bash
set -e

echo "=== Helm Chart Testing ==="
echo ""

CHART_DIR="$(dirname "$0")/.."
cd "$CHART_DIR"

echo "1. Running Helm Lint..."
helm lint . || {
    echo "❌ Helm lint failed"
    exit 1
}
echo "✅ Helm lint passed"
echo ""

echo "2. Testing Chart Template Rendering..."
helm template test . \
    --set secrets.dbPassword=test-password \
    --set secrets.sessionSecret=test-secret > /dev/null || {
    echo "❌ Template rendering failed"
    exit 1
}
echo "✅ Template rendering passed"
echo ""

echo "4. Testing with config.ref (existing ConfigMap)..."
helm template test . \
    --set config.ref=existing-configmap \
    --set secrets.dbPassword=test-password \
    --set secrets.sessionSecret=test-secret > /dev/null || {
    echo "❌ Template rendering with config.ref failed"
    exit 1
}
echo "✅ Template rendering with config.ref passed"
echo ""

if helm plugin list | grep -q unittest; then
    echo "3. Running Helm Unit Tests..."
    helm unittest . || {
        echo "❌ Unit tests failed"
        exit 1
    }
    echo "✅ All unit tests passed"
    echo ""
else
    echo "⚠️  helm-unittest plugin not installed, skipping unit tests"
    echo ""
    echo "   To install, run:"
    echo "   helm plugin install https://github.com/quintush/helm-unittest.git"
    echo ""
    echo "   Or install manually:"
    echo "   helm plugin install https://github.com/quintush/helm-unittest.git"
    echo ""
fi

if command -v ct &> /dev/null; then
    echo "4. Running Chart Testing (ct)..."
    cd "$(dirname "$CHART_DIR")"
    ct lint --charts crossview || {
        echo "❌ Chart testing failed"
        exit 1
    }
    echo "✅ Chart testing passed"
    echo ""
else
    echo "⚠️  ct (chart-testing) not installed, skipping chart testing"
    echo "   Install with: https://github.com/helm/chart-testing"
    echo ""
fi

echo "✅ All tests passed!"

