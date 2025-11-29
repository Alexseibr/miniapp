#!/usr/bin/env bash
set -euo pipefail

# Walks the repository and reports files containing merge conflict markers.
# Usage: scripts/check-conflicts.sh
# Exits with status 0 if no markers are found, otherwise prints the files and exits 1.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
  echo "Error: ripgrep (rg) is required to search for conflict markers." >&2
  exit 2
fi

# Match the literal Git conflict markers only.
matches=$(rg --files-with-matches "^(<<<<<<< |=======$|>>>>>>> )" || true)

if [[ -z "$matches" ]]; then
  echo "No merge conflict markers found."
  exit 0
fi

echo "Merge conflict markers detected in:" >&2
echo "$matches" >&2
exit 1
