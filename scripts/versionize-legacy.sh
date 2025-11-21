#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Использование: ./scripts/versionize-legacy.sh <version> [--ref <ref>] [--push] [--no-branch]

Аргументы:
  <version>        Семантическая версия без префикса v (например, 1.2.0)
  --ref <ref>      База для тега/ветки (коммит/ветка/тег). По умолчанию origin/main
  --push           Пушит тег (и ветку, если создана) в origin
  --no-branch      Не создавать релизную ветку release/<major.minor>

Скрипт помогает разложить старые публикации по версиям: ставит тег v<version>
на выбранный коммит и при необходимости создаёт релизную ветку.
USAGE
}

if [[ ${1:-""} == "-h" || ${1:-""} == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

version=$1
shift

ref="origin/main"
push=false
create_branch=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ref)
      ref=${2:-""}
      if [[ -z "$ref" ]]; then
        echo "[ERROR] Не указан аргумент для --ref" >&2
        exit 1
      fi
      shift 2
      ;;
    --push)
      push=true
      shift
      ;;
    --no-branch)
      create_branch=false
      shift
      ;;
    *)
      echo "[ERROR] Неизвестный аргумент: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! command -v git >/dev/null 2>&1; then
  echo "[ERROR] git не найден" >&2
  exit 1
fi

if ! git diff --quiet --ignore-submodules HEAD --; then
  echo "[ERROR] Рабочее дерево не чистое. Завершение." >&2
  exit 1
fi

origin_ref=$ref
if [[ $ref != origin/* && $ref != refs/* ]]; then
  origin_ref="origin/$ref"
fi

git fetch origin "$ref" >/dev/null 2>&1 || git fetch origin "$origin_ref" >/dev/null 2>&1 || {
  echo "[ERROR] Не удалось fetch для $ref" >&2
  exit 1
}

git fetch origin --tags >/dev/null 2>&1

if ! git rev-parse --verify "$ref" >/dev/null 2>&1; then
  if git rev-parse --verify "$origin_ref" >/dev/null 2>&1; then
    ref=$origin_ref
  else
    echo "[ERROR] Не найден ref: $ref" >&2
    exit 1
  fi
fi

release_line=$(echo "$version" | awk -F. '{print $1"."$2}')
release_branch="release/$release_line"

if git tag --list | grep -q "^v$version$"; then
  echo "[ERROR] Тег v$version уже существует" >&2
  exit 1
fi

if $create_branch; then
  if git show-ref --verify --quiet "refs/heads/$release_branch"; then
    echo "[INFO] Локальная ветка $release_branch уже существует"
  else
    echo "[INFO] Создаю ветку $release_branch от $ref"
    git branch "$release_branch" "$ref"
  fi
fi

echo "[INFO] Ставлю тег v$version на $ref"
git tag -a "v$version" "$ref" -m "Release v$version"

after_push_msg=""
if $push; then
  echo "[INFO] Публикую тег v$version"
  git push origin "v$version"
  if $create_branch; then
    echo "[INFO] Публикую ветку $release_branch"
    git push -u origin "$release_branch"
  fi
  after_push_msg="\nТег и ветка отправлены в origin."
fi

cat <<RESULT
---
Готово: v$version создан на $ref.
Релизная линия: $release_branch${create_branch:+ (создана локально)}
${after_push_msg}
RESULT
