# Backend (Marketplace API)

Сервис отвечает за REST API маркетплейса фермеров: каталоги, заказы, платежи, интеграция с Telegram WebApp и Bot API. Внутри хранится бизнес-логика и доступ к базе данных.

## Установка
1. Перейдите в папку `backend`.
2. Скопируйте `.env.example` в `.env` и заполните секреты.
3. Установите зависимости: `npm install`.

## Пример `.env`
```bash
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fermer_market
TELEGRAM_WEBAPP_SECRET_TOKEN=changeme
CORS_ORIGIN=http://localhost:3000
```

## Запуск
- **Dev**: `npm run dev` — запускает сервер через `nodemon` (или `ts-node`, если есть `src/index.ts`).
- **Prod**: `npm run start` — обычный Node.js запуск.

## Основные эндпоинты
- `GET /api/health` — проверка работоспособности.
- `GET /api/example` — заглушка для быстрой проверки API (замените на реальные маршруты).

## Структура папок
```
backend/
  src/
    index.js       # Точка входа. Добавьте роуты, подключение БД и middleware
  .env.example     # Шаблон переменных окружения
  package.json     # Скрипты и зависимости backend-сервиса
```

> Подсказка: добавьте сюда слой `routes/` и `services/` по мере переноса бизнес-логики.
