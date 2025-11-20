# KETMAR Market API

Быстрый обзор REST-эндпоинтов бэкенда. Все примеры используют базовый URL `http://localhost:3000` (или значение `API_BASE_URL`).

## Служебные эндпоинты

### GET /
Краткая справка по сервису и ссылкам на основные маршруты.

### GET /api
Индекс API. Возвращает версию и основные точки входа.

### GET /health
Простой healthcheck с текущим временем.

## Категории

### GET /api/categories
Возвращает дерево категорий и подкатегорий.

Пример запроса:
```
curl http://localhost:3000/api/categories
```

## Сезоны

### GET /api/seasons
Список всех сезонов.

### GET /api/seasons/active
Только активные сезоны.

### GET /api/seasons/:code/ads
Объявления выбранного сезона (поддерживает фильтры live/geo).

Пример:
```
curl "http://localhost:3000/api/seasons/march8_tulips/ads?live=1&lat=52.1&lng=23.7&radiusKm=5"
```

## Объявления

### GET /api/ads
Базовый список объявлений. Поддерживает фильтры (categoryId, subcategoryId, seasonCode, minPrice, maxPrice, search, sellerId), сортировки и пагинацию.

Пример:
```
curl "http://localhost:3000/api/ads?categoryId=farm&page=1&limit=20"
```

### GET /api/ads/:id
Получение конкретного объявления.

### POST /api/ads
Создание объявления (валидация через middleware `validateCreateAd`).

Тело запроса (минимум):
```json
{
  "title": "Свежая малина",
  "categoryId": "farm",
  "subcategoryId": "berries",
  "price": 10,
  "sellerTelegramId": 123456
}
```

### PATCH /api/ads/:id/status
Обновление статуса/модерации объявления с записью в историю статусов.

### GET /api/ads/search
Расширенный поиск с фильтрами и пагинацией (text/price/season/geo).

Пример:
```
curl "http://localhost:3000/api/ads/search?q=клубника&priceMin=5&priceMax=15&limit=20&offset=0"
```

## Избранное

### GET /api/favorites
Возвращает избранное пользователя по `telegramId` (query).

### POST /api/favorites/add
Добавляет объявление в избранное (`telegramId`, `adId` в body).

### POST /api/favorites/remove
Удаляет объявление из избранного.

## Заказы

### POST /api/orders
Создаёт заказ с позициями, покупателем и комментариями.

Тело запроса (пример):
```json
{
  "buyerTelegramId": 123,
  "items": [
    { "adId": "...", "quantity": 2 }
  ],
  "comment": "Доставка утром"
}
```

### GET /api/orders/my
Возвращает заказы покупателя (`buyerTelegramId` в query).

## Оповещения

### GET /api/alerts/my
История уведомлений по избранному (`telegramId` в query).

### DELETE /api/alerts/clear
Очистка уведомлений пользователя.

---

Для любых эндпоинтов ответы об ошибках имеют формат:
```json
{ "error": "Описание ошибки" }
```
В режиме разработки добавляется поле `details` со стеком.
