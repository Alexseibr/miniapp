# miniapp

Базовый backend и Telegram-бот для маркетплейса объявлений. Используются Node.js 18+, Express, MongoDB (Mongoose) и Telegraf. Веб-витрина/MiniApp пока не реализованы, но API уже готово.

## Быстрый старт

1. Скопируйте `.env.example` в `.env` и задайте настройки:
   - `MONGODB_URI` — строка подключения к MongoDB.
   - `PORT` — порт HTTP-сервера (по умолчанию 3000).
   - `TELEGRAM_BOT_TOKEN` — токен бота. Если не задан, бот не запускается.

   Файл `.env` добавлен в `.gitignore`, поэтому настоящий токен из Telegram и другие чувствительные данные не попадут в репозиторий.
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

- `GET /` — базовая проверка: "API работает. KETMAR Market backend запущен.".
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

## Категории (сиды)

В `src/models/Category.js` определена схема категорий с полями `slug`, `name`, `parentSlug` и `sortOrder`.
Готовый набор для первичной загрузки находится в `src/seed/categories.js`:

- Авто: `auto` → `cars`, `moto`, `trucks`.
- Недвижимость: `realty` → `rent_flat`, `rent_house`, `country_base`.
- Фермерские товары: `farm` → `berries`, `vegetables`, `fruits`, `eggs`, `milk`, `meat`.
- Ремесленники: `craft` → `cakes`, `eclairs`, `cupcakes`, `sweets_sets`.
- Услуги: `services` → `build`, `delivery_services`.

Для начального наполнения можно импортировать данные через `insertMany` в MongoDB Shell/Compass или написать небольшой скрипт на Node.js, используя экспорт `categoriesSeed`.

## Сезоны (акции и витрины)

- Схема в `src/models/Season.js` с полями `code`, `name`, `description`, датами `startDate`/`endDate`, флагом `isActive` и таймстампами.
- Готовый пример сезона находится в `src/seed/seasons.js`:
  - `code: "march8_tulips"`, `name: "Ярмарка 8 Марта — тюльпаны и подарки"`.
- Для загрузки используйте `insertMany` или короткий seed-скрипт с массивом `seasonsSeed`.

## Заказы

- Схема в `src/models/Order.js` описывает заказ с полями покупателя (`buyerTelegramId`, имя/username/телефон-копия) и набором позиций.
- Каждая позиция (`items`) содержит `adId`, `title`, `quantity`, `price` и `sellerTelegramId`; требуется минимум один элемент.
- Статус заказа: `new`, `sent_to_sellers`, `processed`, `cancelled`. Опционально можно указать `seasonCode` и комментарий.
