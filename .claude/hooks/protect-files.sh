#!/usr/bin/env bash
#
# Protect Files Hook
#
# This hook BLOCKS writes to sensitive files that should not be modified by AI.
# It prevents accidental overwriting of configuration, credentials, and generated files.
#
# Usage: Called automatically by Claude Code before Write/Edit operations
# Environment: $FILE_PATH contains the file being written/edited
#

set -e

FILE_PATH="${1:-$FILE_PATH}"

# Exit if no file path provided
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# List of protected file patterns (regex)
PROTECTED_PATTERNS=(
  # Environment and secrets
  "^\.env$"
  "^\.env\.local$"
  "^\.env\.production$"
  "\.pem$"
  "\.key$"
  "id_rsa"
  "\.secret"

  # Database and migrations (generated)
  "^projects/api/drizzle/.*\.sql$"

  # Lock files (managed by package managers)
  "package-lock\.json$"
  "pnpm-lock\.yaml$"
  "yarn\.lock$"

  # Build outputs and cache
  "^dist/"
  "^build/"
  "^\.cache/"
  "^node_modules/"

  # Git metadata
  "^\.git/"

  # Generated test files (should regenerate)
  "^projects/api/test/agent-simulations/generated/"

  # Docker volumes and data
  "^docker/volumes/"
  "^docker/data/"
)

# Check if file matches any protected pattern
for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if echo "$FILE_PATH" | grep -qE "$pattern"; then
    echo "🛡️  BLOCKED: $FILE_PATH is protected"
    echo ""
    echo "This file should not be modified directly:"
    echo "  Pattern matched: $pattern"
    echo ""
    echo "If you need to modify this file:"
    case "$pattern" in
      *"\.env"*)
        echo "  - Edit .env manually or copy from .env.example"
        ;;
      *"drizzle"*)
        echo "  - Modify schema.ts and run: make db-generate"
        ;;
      *"lock"*)
        echo "  - Use package manager: npm install / pnpm install"
        ;;
      *"generated"*)
        echo "  - Regenerate: npm run test:generate"
        ;;
      *"cache"*|*"build"*|*"dist"*)
        echo "  - Rebuild: make build or make clean"
        ;;
      *)
        echo "  - Manually edit this file outside Claude Code"
        ;;
    esac
    echo ""
    exit 1
  fi
done

# Additional checks for specific files
BASENAME=$(basename "$FILE_PATH")

# Warn (but don't block) for configuration files
case "$BASENAME" in
  tsconfig.json|vite.config.ts|vitest.config.ts|drizzle.config.ts)
    echo "⚠️  WARNING: Modifying configuration file: $BASENAME"
    echo "   Make sure this change is intentional."
    # Don't block, just warn
    ;;
esac

exit 0
