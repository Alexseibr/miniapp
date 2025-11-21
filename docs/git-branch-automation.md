# Git ветки и теги: быстрый автопоток

Эта памятка дополняет общий гайд по веткам и релизам: в репозитории есть скрипт `scripts/branch-helper.sh`, который автоматизирует создание ветки от нужной базы и (по желанию) публикацию её в `origin`.

## Краткое использование
```bash
./scripts/branch-helper.sh <type> <slug> [--base <branch>] [--push]
```

- `<type>` — префикс ветки: `feature`, `fix`, `chore`, `release`, `hotfix` и т.д.
- `<slug>` — осмысленное имя (без пробелов), например `payment-webhook`.
- `--base <branch>` — база для новой ветки (по умолчанию `main`). Удобно указывать релизные ветки `release/1.2` для хотфиксов.
- `--push` — сразу пушит ветку в `origin` с `--set-upstream`.

### Примеры
```bash
# Новая фича от main
./scripts/branch-helper.sh feature payment-webhook

# Хотфикс от релизной линии 1.2 и публикация ветки на GitHub
./scripts/branch-helper.sh hotfix checkout-timeout --base release/1.2 --push
```

## Что делает скрипт
1. Проверяет, что git доступен и рабочее дерево чистое (чтобы не потерять изменения).
2. `git fetch origin <base>` и переключается на `<base>`.
3. Подтягивает свежие изменения `git pull origin <base>`.
4. Создаёт ветку `<type>/<slug>` (или переключается на существующую) от указанной базы.
5. Если указан `--push`, публикует ветку в `origin` с upstream-трекингом.

Скрипт не меняет ваши коммиты и не ставит теги. Для релизов используйте теги вручную, например:
```bash
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0
```
