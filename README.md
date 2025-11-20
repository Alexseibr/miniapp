# Fermer Market Monorepo

Монорепозиторий для маркетплейса фермеров: backend API, Telegram-бот и MiniApp (Telegram WebApp). Структура собрана для быстрого локального старта и деплоя.

```
fermer-market-monorepo/
  backend/   # REST API и интеграция с БД
  bot/       # Telegram Bot (Telegraf)
  miniapp/   # Telegram WebApp на Vite
  shared/    # Общие утилиты и типы (пока пусто)
```

## Требования
- Node.js 18+
- npm 9+
- Локальная база MongoDB (для примера)

## Установка
```bash
# Установить зависимости во всех пакетах
npm install
```
`postinstall` автоматически вызовет `npm install` в `backend`, `bot` и `miniapp`.

## Скрипты
- `npm run dev:backend` — запуск backend с hot-reload.
- `npm run dev:bot` — запуск Telegram-бота.
- `npm run dev:miniapp` — запуск Vite Dev Server.
- `npm run dev` — параллельный старт backend + bot.
- `npm run dev:all` — параллельный старт всех модулей.
- `npm run start:backend|bot|miniapp` — прод-режимы для каждого сервиса.

## Backend
1. `cd backend`
2. Скопировать `.env.example` → `.env`
3. `npm run dev`

## Bot
1. `cd bot`
2. Скопировать `.env.example` → `.env`
3. `npm run dev`

## MiniApp
1. `cd miniapp`
2. Скопировать `.env.example` → `.env`
3. `npm run dev`

## Запуск всего вместе
```bash
npm run dev:all
```

## Replit
- Используйте Node.js Stack.
- В `Run` команду добавьте `npm run dev:all` или выберите нужный сервис.
- Переменные окружения задайте в Secrets для каждого пакета.

## Дальнейшие шаги
- Перенесите существующую бизнес-логику в соответствующие пакеты (`backend/src`, `bot/src`, `miniapp/src`).
- Добавьте линтеры и тесты в каждый пакет.
- Заполните `shared/` общими моделями и утилитами.
