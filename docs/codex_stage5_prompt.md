# Этап 5 — геопоиск, избранное, уведомления и сезонные сценарии

Этот документ агрегирует требования, которые можно отдавать Codex блоками. Он описывает изменения для бэкенда KETMAR Market (Node.js, Express, Mongoose, CommonJS) и разбит на четыре части.

## Блок A. Геопоиск «рядом со мной»
### A.1 Обновление модели `Ad`
- В `models/Ad.js` оставить поле `location: { lat, lng }` и добавить `geo` (GeoJSON Point) с индексом `2dsphere`.
- В `pre('save')` синхронизировать `geo` из `location` и заполнять `validUntil` по `lifetimeDays`.

Пример фрагмента:
```js
geo: {
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], index: '2dsphere' }, // [lng, lat]
},
```

### A.2 Эндпоинт `/api/ads/nearby`
- Файл `api/routes/ads.js`.
- `GET /api/ads/nearby?lat=...&lng=...&radiusKm=...&categoryId=...&subcategoryId=...`.
- Обязательны `lat` и `lng`; радиус по умолчанию 5 км.
- Использовать `$near` по полю `geo` (2dsphere) и ограничение 100 объявлений.

### A.3 Базовые фильтры в `/api/ads`
- Добавить поддержку `categoryId`, `subcategoryId`, `seasonCode`, `minPrice`, `maxPrice`.
- По умолчанию `status: "active"`; сортировка по `createdAt: -1` и `limit` из query.

## Блок B. Избранное (лайки)
### B.1 Модель `User`
- Расширить `models/User.js` полем
```js
favorites: [{ adId: ObjectId ref 'Ad', addedAt: { type: Date, default: Date.now } }]
```

### B.2 Маршруты избранного
- Новый файл `api/routes/favorites.js`.
- Авторизация временная: `telegramId` из query/body.
- `GET /api/favorites?telegramId=...` — вернуть активные объявления пользователя.
- `POST /api/favorites` с `telegramId`, `adId` — добавить, если нет.
- `DELETE /api/favorites/:adId?telegramId=...` — удалить.
- Подключить в `api/server.js`: `app.use('/api/favorites', require('./routes/favorites'));`.

## Блок C. Уведомления при изменении цены/статуса
### C.1 Модель `Notification`
- Файл `models/Notification.js` с полями `userTelegramId`, `adId`, `type ('price_change'|'status_change')`, `oldPrice`, `newPrice`, `oldStatus`, `newStatus`, `isSent`, `sentAt`.

### C.2 Хуки в `Ad`
- В `pre('save')` сохранять предыдущие `price`/`status` (для существующих объявлений).
- В `post('save')` сравнивать изменения; если цена или статус изменились — создавать `Notification` для всех пользователей, у кого объявление есть в `favorites`.

### C.3 Эндпоинт уведомлений
- Новый `api/routes/notifications.js` с `GET /api/notifications?telegramId=...` (несent уведомления пользователя).
- Подключить маршрут в `api/server.js`.

## Блок D. Сезонные сценарии
- В `api/routes/seasons.js` добавить:
  - `GET /api/seasons/:code/ads` — активные и одобренные объявления с `seasonCode = :code`.
  - `GET /api/seasons/:code/live-spots` — только `isLiveSpot=true`; опционально `lat/lng/radiusKm` через `$near` по `geo`.
- Используется модель `Ad` с теми же фильтрами статуса и модерации.

## Как пользоваться документом
- Отдавайте Codex отдельными блоками (например, «сделай блок A»), чтобы он генерировал целевые файлы целиком.
- Внутри каждого блока перечислены пути файлов, параметры и ожидаемые структуры ответов.
