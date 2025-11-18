# miniapp

Backend и Telegram-бот для маркетплейса объявлений (Node.js 18+, Express, MongoDB/Mongoose, Telegraf).

## Быстрый старт

1. Скопируйте `.env.example` в `.env` и задайте переменные:
   - `BOT_TOKEN` — токен Telegram-бота (если пуст, бот не запустится).
   - `MONGO_URL` — строка подключения к MongoDB.
   - `PORT` — порт API (по умолчанию 3000).
   - `API_BASE_URL` — базовый URL API, который использует бот (по умолчанию `http://localhost:3000`).
2. Установите зависимости:

   ```bash
   npm install
   ```

3. Запустите сервер и бота:

   ```bash
   npm start
   # или с перезапуском
   npm run dev
   ```

4. (Опционально) Засейдите категории и пример сезона:

   ```bash
   npm run seed
   ```

## Структура проекта

```
project-root/
  index.js                # точка входа: запускает API и бота
  package.json
  .env.example

  /config
    config.js             # чтение env, базовые константы

  /services
    db.js                 # подключение к MongoDB (mongoose)

  /models
    User.js
    Category.js
    Season.js
    Ad.js
    Order.js

  /api
    server.js             # создание Express-приложения
    /routes
      ads.js
      categories.js
      seasons.js
      orders.js
      users.js (заглушка)

  /bot
    bot.js                # Telegraf-бот

  /scripts
    seedCategories.js     # заполнение Category и Season стартовыми данными
```

## API

- `GET /` — проверка базовой доступности API.
- `GET /health` — healthcheck.

### Категории
- `GET /api/categories` — дерево категорий (parentSlug → subcategories), отсортировано по `sortOrder`.

### Сезоны
- `GET /api/seasons` — список всех сезонов.

### Объявления
- `GET /api/ads` — список активных объявлений. Query: `limit` (по умолчанию 20, максимум 100), опционально `categoryId`, `subcategoryId`, `seasonCode`. Ответ: `{ items: Ad[] }`.
- `GET /api/ads/:id` — полное объявление по `_id`.
- `POST /api/ads` — создать объявление. Обязательные поля: `title`, `categoryId`, `subcategoryId`, `price`, `sellerTelegramId`. Пример payload см. команду бота `/new_test_ad`.

### Заказы
- `POST /api/orders` — создать заказ. Бекенд подтягивает актуальные данные объявлений по `adId` (title, price, sellerTelegramId) и сохраняет итоговые `items`.
- `GET /api/orders/:buyerTelegramId` — список заказов покупателя.

## Модели (Mongoose)

- **User**: Telegram-данные, роль, верификация телефона, соцсети, флаги приватности, локация.
- **Category**: `slug`, `name`, `parentSlug`, `sortOrder`.
- **Season**: `code`, `name`, `description`, `startDate`, `endDate`, `isActive`.
- **Ad**: категории/подкатегории, цена + `currency` (BYN по умолчанию), гибкие `attributes`, `photos`, доставка, `sellerTelegramId`, `seasonCode`, статусы, `lifetimeDays` и авто-расчёт `validUntil`, `isLiveSpot`.
- **Order**: покупатель (Telegram ID/имя/username/phone), массив `items` (adId, title, quantity, price, sellerTelegramId), `status`, `seasonCode`, `comment`.

## Telegram-бот

Токен берётся из `BOT_TOKEN`. Использует `API_BASE_URL` для запросов к API.

Команды:
- `/start` — приветствие и список команд.
- `/myid` — ваш Telegram ID, username и имя.
- `/categories` — дерево категорий из API.
- `/new_test_ad` — создаёт тестовое объявление с вашим `sellerTelegramId`.

Бот запускается вместе с API из `index.js`.

## Seed-данные

Скрипт `npm run seed` очищает `Category` и `Season`, затем добавляет базовые категории и сезон `march8_tulips`:
- Авто: auto → cars, moto, trucks
- Недвижимость: realty → rent_flat, rent_house, country_base
- Фермерские товары: farm → berries, vegetables, fruits, eggs, milk, meat
- Ремесленники: craft → cakes, eclairs, cupcakes, sweets_sets
- Услуги: services → build, delivery_services
- Сезон: `code = "march8_tulips"`, `name = "Ярмарка 8 Марта — тюльпаны и подарки"`

