# Telegram Bot

Телеграм-бот управляет пользовательскими сценариями, запускает веб-приложение (MiniApp) и отправляет нотификации о заказах.

## Установка
1. Перейдите в папку `bot`.
2. Скопируйте `.env.example` в `.env` и заполните токены.
3. Установите зависимости: `npm install`.

## Пример `.env`
```bash
TELEGRAM_BOT_TOKEN=your-bot-token
BACKEND_API_URL=http://localhost:5000
WEBAPP_URL=http://localhost:3000
```

## Запуск
- **Dev**: `npm run dev` — hot-reload через `nodemon` (или `ts-node`).
- **Prod**: `npm run start` — чистый Node.js запуск.

## Основные команды
- `/start` — приветствие и кнопка для открытия MiniApp.
- `/ping` — пинг до backend API (`/api/health`).

## Структура папок
```
bot/
  src/
    index.js       # Точка входа. Добавьте обработчики команд/сценариев
  .env.example     # Шаблон переменных окружения
  package.json     # Скрипты и зависимости бота
```

> Подсказка: вынесите сложные цепочки диалогов в `scenes/` или `features/`.
