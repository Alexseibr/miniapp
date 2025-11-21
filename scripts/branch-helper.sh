#!/usr/bin/env bash
set -euo pipefail

print_help() {
  cat <<'USAGE'
Usage: branch-helper.sh <type> <slug> [--base <branch>] [--push]

Create a new branch from <base> (default: main) using the convention <type>/<slug>.
Examples:
  branch-helper.sh feature payment-webhook
  branch-helper.sh hotfix checkout-timeout --base release/1.2 --push

Options:
  --base <branch>   Base branch to create from (default: main)
  --push            Push the new branch to origin with upstream tracking
  -h, --help        Show this help message

Types are not validated beyond string formatting, but recommended values are
feature, fix, chore, release, and hotfix.
USAGE
}

if [[ ${1-} == "-h" || ${1-} == "--help" ]]; then
  print_help
  exit 0
fi

if [[ $# -lt 2 ]]; then
  echo "[branch-helper] Error: <type> and <slug> are required." >&2
  print_help
  exit 1
fi

branch_type=$1
slug=$2
shift 2

base_branch="main"
push_remote=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      base_branch=${2-}
      if [[ -z "$base_branch" ]]; then
        echo "[branch-helper] Error: --base requires a value." >&2
        exit 1
      fi
      shift 2
      ;;
    --push)
      push_remote=true
      shift
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      echo "[branch-helper] Unknown option: $1" >&2
      print_help
      exit 1
      ;;
  esac
done

branch_name="${branch_type}/${slug}"

if ! command -v git >/dev/null 2>&1; then
  echo "[branch-helper] Error: git is not installed or not in PATH." >&2
  exit 1
fi

# Ensure the working tree is clean before switching branches.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "[branch-helper] Error: working tree is not clean. Commit or stash changes before running the helper." >&2
  exit 1
fi

echo "[branch-helper] Fetching origin..."
git fetch origin "$base_branch"

echo "[branch-helper] Checking out base branch '$base_branch'..."
git checkout "$base_branch"

echo "[branch-helper] Pulling latest changes..."
git pull origin "$base_branch"

if git show-ref --verify --quiet "refs/heads/$branch_name"; then
  echo "[branch-helper] Local branch '$branch_name' already exists. Checking it out instead of creating." >&2
  git checkout "$branch_name"
else
  echo "[branch-helper] Creating new branch '$branch_name' from '$base_branch'..."
  git checkout -b "$branch_name" "$base_branch"
fi

if "$push_remote"; then
  echo "[branch-helper] Pushing branch to origin with upstream tracking..."
  git push -u origin "$branch_name"
else
  echo "[branch-helper] Branch ready locally: $branch_name"
fi
