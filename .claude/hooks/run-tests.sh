#!/usr/bin/env bash
#
# Run Tests Hook
#
# This hook runs AFTER code changes to verify functionality.
# It intelligently runs only relevant tests based on what files changed.
#
# Usage: Called automatically by Claude Code after Write/Edit operations
# Environment: $FILE_PATH contains the file that was written/edited
#

set -e

FILE_PATH="${1:-$FILE_PATH}"

# Exit if no file path provided
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Skip tests for non-code files
case "$FILE_PATH" in
  *.md|*.json|*.yml|*.yaml|*.env*|*.sh)
    echo "ℹ️  Skipping tests for non-code file: $FILE_PATH"
    exit 0
    ;;
esac

# Skip tests for test files themselves
if echo "$FILE_PATH" | grep -q "test/"; then
  echo "ℹ️  Skipping tests for test file: $FILE_PATH"
  exit 0
fi

# Only run tests for API files
if [[ "$FILE_PATH" != */projects/api/* ]]; then
  echo "ℹ️  Skipping tests for non-API file: $FILE_PATH"
  exit 0
fi

echo "🧪 Running tests for changed file: $FILE_PATH"
echo ""

cd projects/api

# Quick type check first (fast feedback)
echo "📝 Type checking..."
if npm run typecheck 2>&1 | grep -E "(error TS|Build failed)"; then
  echo "❌ Type check failed!"
  echo "   Fix type errors before proceeding."
  exit 1
fi
echo "✓ Type check passed"
echo ""

# Determine which tests to run based on file path
if echo "$FILE_PATH" | grep -qE "modules/rag/|modules/chat/|modules/embeddings/|modules/vector-db/"; then
  # Core RAG modules - run unit and integration tests
  echo "🔬 Running unit tests..."
  npm test -- --run test/unit/ --reporter=verbose 2>&1 | tail -20

  echo ""
  echo "🔗 Running integration tests..."
  npm test -- --run test/integration/ --reporter=verbose 2>&1 | tail -20

  echo ""
  echo "✨ Consider running agent simulations:"
  echo "   npm run test:simulations"

elif echo "$FILE_PATH" | grep -qE "modules/contact-collection/"; then
  # Contact collection - run specific unit tests
  echo "🔬 Running contact collection tests..."
  npm test -- --run test/unit/contact-collection.test.ts --reporter=verbose

elif echo "$FILE_PATH" | grep -qE "modules/metrics/"; then
  # Metrics - run unit tests only
  echo "🔬 Running metrics tests..."
  npm test -- --run test/unit/ --reporter=verbose 2>&1 | grep -A 5 "metrics"

else
  # Other modules - run basic unit tests
  echo "🔬 Running unit tests..."
  npm test -- --run test/unit/ --reporter=verbose 2>&1 | tail -20
fi

echo ""
echo "✓ Tests completed"
echo ""
echo "💡 Tips:"
echo "   - Run full test suite: make test"
echo "   - Run with coverage: make test-cov"
echo "   - Run simulations: make test-simulations"
echo "   - Run all checks: make check"

exit 0
