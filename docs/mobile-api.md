# Mobile API v1

Базовый префикс: `/api/mobile/v1`

## Формат ответа
```
{
  "success": true/false,
  "data": {},
  "error": {
    "code": "STRING",
    "message": "string",
    "details": {}
  }
}
```

## Авторизация
- JWT в заголовке `Authorization: Bearer <token>`.
- `POST /api/mobile/v1/auth/request-code` — запрос SMS кода (`phone`).
- `POST /api/mobile/v1/auth/confirm-code` — подтверждение (`phone`, `code`) → `accessToken`, `refreshToken`.
- `POST /api/mobile/v1/auth/telegram` — вход по `initData`.
- `POST /api/mobile/v1/auth/refresh` — обновление `accessToken`.

## Пользователи
- `GET /users/me`
- `PATCH /users/me` — обновление имени/аватара/города/настроек уведомлений.

## Категории
- `GET /categories` — дерево категорий.
- `GET /categories/:id/subcategories` — список подкатегорий.

## Объявления
- `GET /ads` — параметры: `categoryId`, `subcategoryId`, `q`, `minPrice`, `maxPrice`, `city`, `region`, `sortBy`, `page`, `limit`, `lat`, `lng`.
- `GET /ads/:id`
- `GET /ads/nearby` — `lat`, `lng`, `radiusKm`, пагинация.
- `POST /ads` — создание (требует авторизации, валидация zod).
- `PATCH /ads/:id` — редактирование своего объявления.
- `DELETE /ads/:id` — удаление своего объявления.

## Избранное и уведомления
- `GET /favorites`
- `POST /favorites/:adId`
- `DELETE /favorites/:adId`
- `POST /notifications/register` — регистрирует `deviceId`, `pushToken`, `platform`, `appVersion`.

## Заказы
- `POST /orders` — `adId`, `quantity`, контакты.
- `GET /orders/my`
- `GET /orders/:id`

## Чаты
- `POST /chats` — создать/получить чат по объявлению.
- `GET /chats`
- `GET /chats/:id/messages`
- `POST /chats/:id/messages`
