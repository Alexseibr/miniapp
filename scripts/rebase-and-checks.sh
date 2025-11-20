#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/rebase-and-checks.sh <branch>
# Example: ./scripts/rebase-and-checks.sh codex/implement-seasonal-functionality-for-marketplace

BRANCH="${1:-}"
ORIGIN="origin"
MAIN_BRANCH="main"
BACKUP_PREFIX="backup_before_rebase"

if [ -z "$BRANCH" ]; then
  echo "Usage: $0 <branch>"
  exit 2
fi

echo "1) Fetch latest from remote..."
git fetch "$ORIGIN"

echo "2) Make local backup of branch (safe)..."
git checkout -B "${BACKUP_PREFIX}/${BRANCH}" "${ORIGIN}/${BRANCH}"
git checkout -B "$BRANCH" "${ORIGIN}/${BRANCH}"

echo "3) Rebase onto ${MAIN_BRANCH}..."
# Try rebase; if conflicts, stop and leave worktree for manual resolution
if git rebase "${ORIGIN}/${MAIN_BRANCH}"; then
  echo "Rebase succeeded."
else
  echo "Rebase failed — conflicts detected."
  echo "Resolve conflicts, then run: git add <resolved-files> ; git rebase --continue"
  echo "If you want to abort: git rebase --abort and git checkout ${BACKUP_PREFIX}/${BRANCH}"
  exit 3
fi

echo "4) Install dependencies and run static checks..."
if [ -f package-lock.json ] || [ -f yarn.lock ]; then
  # prefer npm ci if lockfile present
  npm ci
else
  npm install
fi

echo "-> TypeScript check (no emit)"
npx -y tsc --noEmit

echo "-> Lint (if available)"
if npm run | grep -q 'lint'; then
  npm run lint
else
  echo "No lint script found in package.json"
fi

echo "-> Build (if available)"
if npm run | grep -q 'build'; then
  npm run build
else
  echo "No build script found in package.json"
fi

 echo "-> Tests (if available)"
if npm run | grep -q 'test'; then
  npm run test
else
  echo "No test script found in package.json"
fi

echo "5) If checks passed, push branch (recommended with --force-with-lease after verifying)"
echo "To push: git push --force-with-lease $ORIGIN $BRANCH"
echo "Backup branch is available: ${BACKUP_PREFIX}/${BRANCH}"
echo "Done.
"