#!/usr/bin/env bash
#
# Format Code Hook
#
# This hook runs BEFORE writing/editing code files to ensure consistent formatting.
# It uses Prettier to auto-format TypeScript, JavaScript, JSON, and Markdown files.
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

# Only format specific file types
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.md)
    # Check if file is in projects directory (has prettier config)
    if [[ "$FILE_PATH" == */projects/* ]]; then
      # Determine which project (api or frontend)
      if [[ "$FILE_PATH" == */projects/api/* ]]; then
        PROJECT_DIR="projects/api"
      elif [[ "$FILE_PATH" == */projects/frontend/* ]]; then
        PROJECT_DIR="projects/frontend"
      else
        # Not in a specific project, skip
        exit 0
      fi

      # Check if prettier is available
      if [ -f "$PROJECT_DIR/node_modules/.bin/prettier" ]; then
        echo "🎨 Formatting $FILE_PATH with Prettier..."
        cd "$PROJECT_DIR"
        npx prettier --write "../..$FILE_PATH" 2>/dev/null || {
          echo "⚠️  Prettier formatting failed, continuing anyway..."
          exit 0
        }
        echo "✓ Formatted successfully"
      fi
    fi
    ;;
  *)
    # Not a file we format, skip
    exit 0
    ;;
esac

exit 0
