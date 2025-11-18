# miniapp

Базовый backend и Telegram-бот для маркетплейса объявлений. Используются Node.js 18+, Express, MongoDB (Mongoose) и Telegraf. Веб-витрина/MiniApp пока не реализованы, но API уже готово.

## Быстрый старт

1. Скопируйте `.env.example` в `.env` и задайте настройки:
   - `MONGODB_URI` — строка подключения к MongoDB.
   - `PORT` — порт HTTP-сервера (по умолчанию 3000).
   - `TELEGRAM_BOT_TOKEN` — токен бота. Если не задан, бот не запускается.
2. Установите зависимости:

   ```bash
   npm install
   ```

3. Запустите сервер:

   ```bash
   npm start
   # или для разработки с перезапуском
   npm run dev
   ```

## API

- `GET /health` — проверка состояния.
- `GET /api/ads` — список объявлений, опции: `limit`, `tag`, `search` по названию.
- `GET /api/ads/:id` — получить объявление.
- `POST /api/ads` — создать (body: `title`, `description`, `price`, `phone`, `tags`).
- `PATCH /api/ads/:id` — обновить объявление.
- `DELETE /api/ads/:id` — удалить объявление.

## Telegram-бот

- `/start` — приветствие и краткая подсказка.
- `/latest` — последние 5 объявлений.
- Любой текст ≥3 символов — поиск по названию.

Бот использует ту же базу MongoDB, что и API. Для корректной работы подключите MongoDB перед запуском бота.
