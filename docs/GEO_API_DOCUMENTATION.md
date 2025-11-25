# Geo-Search API Documentation

## Обзор

KETMAR Market предоставляет мощный API для геопоиска объявлений. Система использует MongoDB 2dsphere индекс и поддерживает расчёт расстояний по формуле Haversine.

## Endpoints

### 1. GET /api/ads/nearby

**Основной endpoint для геопоиска** - поиск объявлений в заданном радиусе от координат пользователя.

#### Параметры запроса

| Параметр | Тип | Обязательный | По умолчанию | Описание |
|----------|-----|--------------|--------------|-----------|
| `lat` | number | ✅ Да | - | Широта точки поиска |
| `lng` | number | ✅ Да | - | Долгота точки поиска |
| `radiusKm` | number | Нет | 10 | Радиус поиска (мин: 0.1, макс: 100 км) |
| `categoryId` | string | Нет | - | Фильтр по категории |
| `subcategoryId` | string | Нет | - | Фильтр по подкатегории |
| `limit` | number | Нет | 50 | Количество результатов (макс: 200) |
| `minPrice` | number | Нет | - | Минимальная цена |
| `maxPrice` | number | Нет | - | Максимальная цена |
| `sort` | string | Нет | `distance` | Сортировка: `distance`, `cheapest`, `expensive`, `popular` |

#### Пример запроса

```bash
GET /api/ads/nearby?lat=52.093752&lng=23.688094&radiusKm=5&sort=distance&limit=20
```

#### Пример ответа

```json
{
  "items": [
    {
      "_id": "67442cd8fc9e0ee6ba4e1e16",
      "title": "iPhone 15 Pro 256GB",
      "price": 2400,
      "currency": "BYN",
      "photos": ["https://..."],
      "location": {
        "lat": 52.093852,
        "lng": 23.688194,
        "geo": {
          "type": "Point",
          "coordinates": [23.688194, 52.093852]
        }
      },
      "distanceKm": 0.1,
      "categoryId": "electronics",
      "status": "active",
      "createdAt": "2025-11-25T08:54:16.607Z"
    }
  ]
}
```

#### Особенности

- ✅ **Обязательная валидация**: lat и lng должны быть валидными числами
- ✅ **Автоматическое ограничение**: radiusKm автоматически обрезается до диапазона [0.1, 100]
- ✅ **Расчёт расстояний**: Использует Haversine-формулу для точности
- ✅ **Поле distanceKm**: Всегда присутствует в результатах, округлено до 1 знака после запятой

---

### 2. GET /api/ads/search

**Универсальный endpoint** для поиска с опциональной geo-фильтрацией. Использует MongoDB `$geoNear` агрегацию для эффективного поиска.

#### Параметры запроса

| Параметр | Тип | Обязательный | По умолчанию | Описание |
|----------|-----|--------------|--------------|-----------|
| `q` | string | Нет | - | Текстовый поиск по title, description, attributes |
| `buyerLat` | number | Нет | - | Широта покупателя (для geo-поиска) |
| `buyerLng` | number | Нет | - | Долгота покупателя (для geo-поиска) |
| `maxDistanceKm` | number | Нет | - | Максимальное расстояние от покупателя (км) |
| `categoryId` | string | Нет | - | Фильтр по категории |
| `subcategoryId` | string | Нет | - | Фильтр по подкатегории |
| `priceMin` | number | Нет | - | Минимальная цена |
| `priceMax` | number | Нет | - | Максимальная цена |
| `deliveryType` | string | Нет | - | `pickup_only`, `delivery_only`, `delivery_and_pickup` |
| `deliveryAvailable` | boolean | Нет | false | Доставка доступна на расстояние до покупателя |
| `seasonCode` | string | Нет | - | Фильтр по сезонному коду |
| `sort` | string | Нет | `createdAt` | `distance`, `price_asc`, `price_desc`, `popular`, `newest`, `oldest` |
| `limit` | number | Нет | 20 | Количество результатов (макс: 100) |
| `offset` | number | Нет | 0 | Смещение для пагинации |

#### Пример запроса (с geo)

```bash
GET /api/ads/search?buyerLat=52.093752&buyerLng=23.688094&maxDistanceKm=10&sort=price_asc&limit=20
```

#### Пример запроса (без geo)

```bash
GET /api/ads/search?q=iPhone&categoryId=electronics&priceMax=3000&sort=price_asc
```

#### Пример ответа

```json
{
  "items": [
    {
      "_id": "67442cd8fc9e0ee6ba4e1e16",
      "title": "iPhone 15 Pro 256GB",
      "price": 2400,
      "distanceKm": 0.1,
      "..."
    }
  ],
  "total": 327,
  "hasMore": true
}
```

#### Режимы работы

**С геопоиском** (если указаны `buyerLat` и `buyerLng`):
- Использует `$geoNear` агрегацию MongoDB
- Возвращает поле `distanceKm` для каждого результата
- Поддерживает сортировку по расстоянию (`sort=distance`)
- Можно ограничить радиус через `maxDistanceKm`

**Без геопоиска**:
- Обычный поиск по фильтрам
- Поле `distanceKm` отсутствует
- Сортировка по дате/цене/популярности

---

## Сортировка

Оба endpoint поддерживают сортировку:

| Значение | Описание |
|----------|----------|
| `distance` | По расстоянию (ближайшие первыми) — **только для geo-поиска** |
| `price_asc` / `cheapest` | От дешёвых к дорогим |
| `price_desc` / `expensive` | От дорогих к дешёвым |
| `popular` | По количеству просмотров |
| `newest` / `date_desc` | Новые первыми |
| `oldest` / `date_asc` | Старые первыми |

---

## Коды ошибок

| Код | Описание |
|-----|----------|
| `400` | Невалидные параметры (отсутствие lat/lng, некорректные числа) |
| `500` | Внутренняя ошибка сервера |

**Примеры ошибок:**

```json
{
  "error": "lat и lng обязательны"
}
```

```json
{
  "error": "lat и lng должны быть числами"
}
```

```json
{
  "error": "deliveryAvailable требует координаты buyerLat/buyerLng"
}
```

---

## Модель данных

### Структура Location в Ad

```javascript
location: {
  lat: Number,        // Широта (для удобства)
  lng: Number,        // Долгота (для удобства)
  geo: {              // GeoJSON Point для MongoDB geo-запросов
    type: "Point",
    coordinates: [lng, lat]  // ⚠️ Порядок: [долгота, широта]
  }
}
```

### Поле distanceKm в ответах

- **Тип**: Number
- **Формат**: Округлено до 1 знака после запятой
- **Единицы**: Километры
- **Присутствует**: Только в geo-поиске (когда есть lat/lng)

---

## Производительность

### Индексы MongoDB

```javascript
// Геопространственный индекс для эффективного поиска
adSchema.index({ 'location.geo': '2dsphere' });

// Дополнительные индексы для фильтрации
adSchema.index({ status: 1, moderationStatus: 1 });
adSchema.index({ categoryId: 1, subcategoryId: 1 });
adSchema.index({ price: 1 });
adSchema.index({ views: -1 });
```

### Рекомендации

- Для больших радиусов (>50 км) рекомендуется использовать пагинацию
- При высокой нагрузке рассмотрите добавление составных индексов:
  - `{ status: 1, moderationStatus: 1, price: 1 }`
  - `{ status: 1, moderationStatus: 1, views: -1 }`

---

## Примеры использования

### JavaScript (Frontend)

```javascript
// Получить объявления рядом с пользователем
async function getNearbyAds(lat, lng, radiusKm = 5) {
  const response = await fetch(
    `/api/ads/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}&sort=distance`
  );
  const data = await response.json();
  return data.items;
}

// Поиск с geo-фильтрацией
async function searchAds(filters) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/ads/search?${params}`);
  const data = await response.json();
  return {
    items: data.items,
    total: data.total,
    hasMore: data.hasMore
  };
}

// Пример использования
const ads = await getNearbyAds(52.093752, 23.688094, 10);
console.log(`Найдено ${ads.length} объявлений`);
console.log(`Ближайшее: ${ads[0].title} на расстоянии ${ads[0].distanceKm} км`);
```

### cURL

```bash
# Поиск в радиусе 5км от координат
curl "http://localhost:5000/api/ads/nearby?lat=52.093752&lng=23.688094&radiusKm=5"

# Поиск с фильтрами и сортировкой по цене
curl "http://localhost:5000/api/ads/search?buyerLat=52.093752&buyerLng=23.688094&maxDistanceKm=10&categoryId=electronics&sort=price_asc&limit=20"
```

---

## Разница между /nearby и /search

| Характеристика | /nearby | /search |
|---------------|---------|---------|
| **Geo-параметры** | `lat`, `lng`, `radiusKm` | `buyerLat`, `buyerLng`, `maxDistanceKm` |
| **Geo обязательно?** | ✅ Да | ❌ Нет (опционально) |
| **Метод поиска** | Haversine формула | MongoDB $geoNear агрегация |
| **Текстовый поиск** | ❌ Нет | ✅ Да (параметр `q`) |
| **Фильтр доставки** | ✅ Базовый | ✅ Расширенный (`deliveryAvailable`) |
| **Пагинация** | limit | limit + offset |
| **Производительность** | Средняя | Высокая (использует индексы) |
| **Рекомендуется для** | Простой "Рядом со мной" | Комплексный поиск с фильтрами |

---

## Changelog

### v1.1.0 (25.11.2025)
- ✅ Добавлена полная поддержка сортировок в /search
- ✅ Добавлена валидация radiusKm с мин/макс значениями
- ✅ Улучшена документация JSDoc

### v1.0.0 (Начальная версия)
- ✅ Endpoint /api/ads/nearby
- ✅ Endpoint /api/ads/search с geo-поддержкой
- ✅ Расчёт distanceKm
- ✅ Базовые фильтры и сортировки
