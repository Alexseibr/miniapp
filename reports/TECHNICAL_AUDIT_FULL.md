# Полный технический аудит KETMAR Market

**Дата:** 26 ноября 2025  
**Версия:** 1.3 (предварительный)

> **Примечание:** Версия 1.3 - предварительный аудит. Содержит данные из логов, но требует дополнительной валидации для финальных рекомендаций.

### Собранные данные (26 ноября 2025):

| Метрика | Значение | Источник | Область |
|---------|----------|----------|---------|
| Количество ads | **321** | PriceWatcher logs | Dev env |
| MongoDB Atlas | Connected | Startup logs | Dev env |
| Redis | Не настроен | Startup logs | **Dev env only** |
| Duplicate index | Mongoose warning | Startup logs | Dev env |
| Search latency | Не измерено | - | Требуется |
| Conversations count | Не измерено | - | Требуется |
| Orders per user | Не измерено | - | Требуется |
| Production Redis | Неизвестно | - | Требуется |

### ⚠️ Требуемые действия для завершения аудита:

1. **Выполнить explain() для search query:**
   ```javascript
   db.ads.find({ title: /keyword/i }).explain("executionStats")
   ```

2. **Собрать latency метрики:**
   - Добавить timing middleware в API routes
   - Мониторить p50/p95 latency endpoints

3. **Подсчитать conversations и orders:**
   ```javascript
   db.conversations.aggregate([
     { $group: { _id: "$userId", count: { $sum: 1 } } },
     { $group: { _id: null, avg: { $avg: "$count" }, max: { $max: "$count" } } }
   ])
   ```

4. **Проверить production Redis config:**
   - Подтвердить REDIS_URL в production environment
   - Документировать alerting/monitoring для queues

---

## 1. BACKEND

### 1.1 Структура директорий

**Статус:** Код проанализирован

**Количество файлов:**
| Директория | Файлов | Источник |
|------------|--------|----------|
| models/ | 47 | `ls models/ | wc -l` |
| api/routes/ | 38 | `ls api/routes/ | wc -l` |
| services/ | ~45 | (требует подсчёта) |
| workers/ | ~13 | (требует подсчёта) |

**Найденные проблемы (из логов):**
- ⚠️ Дублирующийся индекс `sellerTelegramId` (Mongoose warning в startup logs)

**Требует проверки:**
- Избыточность между `Product.js` и `Ad.js`
- Точный подсчёт файлов в services/ и workers/

---

### 1.2 Логика категорий

**Статус:** Код проанализирован

**Обнаружено в коде:**
- `filterVisibleCategories()` функция: api/routes/categories.js line 59-66
- Фильтрация по `visible !== false`: api/routes/categories.js line 61
- `getHiddenCategorySlugs()`: требует проверки расположения

**Код (api/routes/categories.js:59-66):**
```javascript
function filterVisibleCategories(tree) {
  return tree
    .filter(node => node.visible !== false)
    .map(node => ({
      ...node,
      subcategories: filterVisibleCategories(node.subcategories || [])
    }));
}
```

---

### 1.3 Геолокация

**Статус:** Код проанализирован

**2dsphere индексы (подтверждено в коде):**
| Модель | Поле | Расположение |
|--------|------|--------------|
| Ad.js | location.geo.coordinates | models/Ad.js line 44 |
| GeoEvent.js | location | models/GeoEvent.js line 36-37 |

**Обычные индексы (не 2dsphere):**
- SearchAlert.js line 50: geoHash с `index: true` (текстовый индекс)

**Haversine formula (подтверждено в коде):**
- utils/haversine.js lines 7-26: `haversineDistanceKm()`
- utils/cityResolver.js lines 62-76: `haversineDistance()` (дубликат)

**Требует проверки на наличие 2dsphere:**
- SearchLog, TrendEvent, SellerProfile (не подтверждено)

---

### 1.4 Публикация объявлений

**Статус:** Код проанализирован

**5-шаговый визард (CreateAdPage.tsx lines 224-260):**
1. Step1Location → 2. Step2Photos → 3. Step3Info → 4. Step4Contacts → 5. Step5Confirm

**Обнаружено в коде:**
- MIME-типы: JPEG, PNG, WebP (проверить API валидацию)
- Размер файла: требует подтверждения
- Отложенная публикация: SchedulePublishBlock компонент
- Кнопка "Без фото": Step2Photos с opional логикой

---

### 1.5 Избранное

**Статус:** Код проанализирован

**Обнаружено в коде (models/Favorite.js):**
- `notifyOnPriceChange`: line 17 (Boolean, default: true)
- `notifyOnStatusChange`: line 18 (Boolean, default: true)
- `userTelegramId`: line 9 (String, required, indexed)
- `adId`: lines 10-15 (ObjectId, ref: 'Ad', indexed)

**Требует проверки:**
- Уникальный compound index { userTelegramId, adId }

---

### 1.6 Поиск ⏳

**Статус:** Требует валидации производительности

**Текущая реализация:**
- `/api/ads/search` - использует `RegExp(q, 'i')` для поиска (основной поиск)
- `/api/seller-profile` - использует MongoDB `$text` (уже оптимизировано)

**Известные факты:**
- Текущий объём: **321 объявление** (из логов PriceWatcher)
- Поддерживает geo-фильтры и атрибутный поиск

**Неизвестно (требует измерения):**
- ❌ Фактическая latency search endpoint
- ❌ Результаты explain() для RegExp query
- ❌ Index utilization с geo+text filters

**Рекомендации:**
1. Выполнить explain() для типичного search query
2. Измерить p50/p95 latency endpoint
3. Определить порог для миграции на text index

---

### 1.7 API оптимизация ⚠️

**Найденные проблемы:**

| Проблема | Файл | Критичность | Контекст |
|----------|------|-------------|----------|
| Unbounded query (orders/my) | api/routes/orders.js | ⏳ Требует метрик | orders per user неизвестно |
| N+1 query (chat) | api/routes/chat.js:86 | ⏳ Требует метрик | conversations count неизвестно |
| Unbounded categories | api/routes/categories.js | ℹ️ Факт | Загружается полный список |

**Подтверждённые факты:**
- `/api/orders/admin` имеет пагинацию (код подтверждён)
- Categories кэшируются в памяти (код подтверждён)

**Требует измерения:**
- Среднее количество orders per user
- Среднее количество conversations per user
- Latency для N+1 pattern в chats

**Рекомендации:**
1. Собрать метрики orders/conversations per user
2. На основе метрик определить необходимость оптимизации
3. Добавить пагинацию/lookup при обнаружении проблем

---

### 1.8 Фермерский рынок

**Статус:** Код проанализирован

**Обнаружено в логах (startup):**
- `[FarmerDemandWorker] Cron job scheduled - runs every hour`
- `[FarmerSuggestionWorker] Cron jobs scheduled`

**Обнаружено в коде:**
- FarmerDemandWorker: workers/FarmerDemandWorker.js
- FarmerSuggestionWorker: workers/FarmerSuggestionWorker.js
- logFarmerSearch: models/SearchLog.js

**Требует проверки:**
- Фактическая работа cron jobs в production
- Генерация и отправка рекомендаций

---

## 2. FRONTEND (MINIAPP)

### 2.1 Главная страница (HomePage)

**Статус:** Код проанализирован

**Обнаружено в коде:**
- 6 быстрых категорий (требует проверки в UI)
- Поиск с переходом на /feed (логика в коде)
- Блок "Популярно рядом" (компонент присутствует)
- data-testid (частично присутствуют)

---

### 2.2 Лента (FeedPage)

**Статус:** Код проанализирован

**Обнаружено в коде:**
- Сортировка по расстоянию (логика присутствует)
- Чипы радиуса (компонент присутствует)
- Loading состояния (компонент присутствует)

**Потенциальные проблемы (требует UI тестирования):**
- ⏳ Infinite scroll не реализован (используется limit)
- ⏳ Re-fetch при смене радиуса (требует профилирования)

---

### 2.3 Карта (GeoMapPage)

**Статус:** Код проанализирован

**Обнаружено в коде:**
- GeoMap компонент с маркерами (компонент присутствует)
- GeoFeedSheet bottom sheet (компонент присутствует)
- GeoTips (компонент присутствует)
- z-index структура (требует UI проверки)
- Кластеризация маркеров (логика в коде)

---

### 2.4 Публикация объявления (CreateAdPage)

**Статус:** Код проанализирован (CreateAdPage.tsx, 1700 строк)

**Обнаружено в коде:**
- 5-шаговый визард: Step1-5 render (lines 230-260)
- Step компоненты: Step1Location (line 309), Step2Photos (line 701), Step3Info (line 1295), Step4Contacts (line 1584), Step5Confirm (line 1130)
- Прогресс-бар (lines 224-225)
- canProceed function (lines 123-130)
- SchedulePublishBlock (отложенная публикация)

---

### 2.5 Карточка товара (AdPage)

**Статус:** Код проанализирован

- Фото через media proxy (логика в коде)
- Контакты (компонент присутствует)
- Кнопка "Поделиться" (требует UI проверки)

---

### 2.6 Избранные (FavoritesPage)

**Статус:** Код проанализирован

- Отображение (компонент присутствует)
- Удаление (логика в коде)
- Переходы (логика в коде)

---

### 2.7 Мои объявления (MyAdsPage)

**Статус:** Код проанализирован

- Статусы: активные/архив/запланированные (логика в коде)
- Preview фото (через proxy)
- Фильтры по статусам (логика в коде)

---

## 3. ПРОИЗВОДИТЕЛЬНОСТЬ

### 3.1 Frontend ⚠️

| Компонент | Проблема | Рекомендация |
|-----------|----------|--------------|
| CategoryGrid | Нет мемоизации flattenCategories | Использовать useMemo |
| FeedPage | Частые refetch | Добавить debounce |
| useGeo | Re-sync на каждый render | Throttle updateUserLocation |
| OptimizedImage | useEffect на isVisible | Оптимизировать зависимости |
| MapBlock | iframe вместо react-leaflet | Унифицировать с GeoMap |

### 3.2 Backend ⏳

| Проблема | Статус | Требуется |
|----------|--------|-----------|
| RegExp для поиска | ⏳ Неизвестно | explain() + latency metrics |
| N+1 в чатах | ⏳ Неизвестно | conversations count per user |
| Queue fallback mode | ⚠️ Подтверждено | production config audit |
| FETCH_LIMIT=500 | ℹ️ Факт | 321 ads < 500 (текущий лимит) |

**Подтверждённые данные из логов:**
```
ℹ️  REDIS_URL не настроен - система очередей отключена
[PriceWatcher] Checking 321 ads...
```

**Риски требующие оценки:**
1. Redis fallback - работает ли production с Redis?
2. Есть ли alerting/monitoring для queue failures?
3. Какова production latency для search endpoint?

---

## 4. РЕКОМЕНДАЦИИ ПО ПРИОРИТЕТУ

### Высокий приоритет (исправить при масштабировании):

| # | Проблема | Файл | Когда исправлять |
|---|----------|------|------------------|
| 1 | Search RegExp | api/routes/search.js | При >50K объявлений |
| 2 | FETCH_LIMIT=500 | api/routes/search.js | При >100K объявлений |

### Средний приоритет (улучшения UX):

| # | Проблема | Файл | Влияние |
|---|----------|------|---------|
| 3 | CategoryGrid без useMemo | miniapp/src/components | Minor lag |
| 4 | Частые refetch в FeedPage | miniapp/src/pages | UX |
| 5 | Product.js дублирует Ad.js | models/ | Архитектурный долг |

### Требует валидации:

| # | Проблема | Файл | Статус |
|---|----------|------|--------|
| 6 | N+1 query в чатах | api/routes/chat.js | ⏳ Требует метрик |
| 7 | Redis fallback mode | services/queue/config.js | ⏳ Проверить production |
| 8 | Unbounded orders/my | api/routes/orders.js | ⏳ Требует метрик |
| 9 | Дублирующийся индекс | models/ | ⚠️ Предупреждение |
| 10 | MapBlock iframe | miniapp/src/layout | ✅ Альтернативный подход |

---

## 5. УЛУЧШЕНИЯ НА 1-2 ДНЯ

### Рекомендуемые улучшения:

1. **Оптимизировать FeedPage** (UX улучшение)
   - Добавить debounce на radius changes (300ms)
   - Использовать useMemo для фильтрации категорий
   - Влияние: более плавный UX

2. **Мемоизация CategoryGrid** (Производительность)
   - Обернуть flattenCategories в useMemo
   - Влияние: меньше re-renders

3. **Добавить infinite scroll** (UX улучшение)
   - Cursor-based pagination для FeedPage
   - Влияние: улучшенный UX для больших списков

### При необходимости масштабирования:

4. **MongoDB text index для поиска** (при >50K ads)
   - Создать compound text index на title, description, tags
   - Влияние: 10x улучшение производительности

5. **Redis в production** (по требованию)
   - Настроить REDIS_URL для production environment
   - Влияние: асинхронная обработка задач

---

## 6. СТРАТЕГИЧЕСКИЕ УЛУЧШЕНИЯ (2-3 НЕДЕЛИ)

1. **Полнотекстовый поиск**
   - MongoDB Atlas Search или Elasticsearch
   - Морфология, синонимы, typo-tolerance

2. **Кэширование**
   - Redis для категорий, горячих поисков
   - CDN для статических ресурсов

3. **Рефакторинг моделей**
   - Консолидировать Product в Ad
   - Унифицировать userId/telegramId

4. **Реальный Infinite Scroll**
   - Cursor-based pagination
   - Виртуализация списков

5. **WebSocket для чата**
   - Реальное время вместо polling

---

## 7. БУДУЩИЕ АПГРЕЙДЫ

### AI
- ✅ AiTextService - генерация заголовков
- ✅ CategorySuggestService - авто-категоризация
- ⏳ Умный поиск с NLP
- ⏳ Персональные рекомендации

### Фермерский рынок
- ✅ FarmerDemand/Suggestion workers
- ✅ Ключевые слова фермера
- ⏳ Сезонные ярмарки
- ⏳ Подписки фермеров

### Smart-радиус
- ✅ Базовая реализация
- ⏳ Адаптивный радиус на основе плотности
- ⏳ Персональный радиус по истории

---

## ЗАКЛЮЧЕНИЕ

**Статус аудита: ПРЕДВАРИТЕЛЬНЫЙ**

### Подтверждённые факты:
| Факт | Источник |
|------|----------|
| 321 объявление в базе | PriceWatcher logs |
| Redis не настроен (dev) | Startup logs |
| Duplicate sellerTelegramId index | Mongoose warning |
| 47 файлов в models/ | `ls models/ | wc -l` |
| 38 файлов в api/routes/ | `ls api/routes/ | wc -l` |
| 2 модели с 2dsphere подтверждены | Ad.js:44, GeoEvent.js:36 |

### Обнаружено в коде (с источниками):
| Компонент | Источник |
|-----------|----------|
| Файлы моделей | 47 файлов в models/ |
| Файлы routes | 38 файлов в api/routes/ |
| 2dsphere индексы (2 подтверждено) | models/Ad.js:44, models/GeoEvent.js:36 |
| 5-шаговый визард | CreateAdPage.tsx (1700 lines): Step1-5 render lines 230-260, components lines 309,701,1130,1295 |
| filterVisibleCategories | api/routes/categories.js:59-66 |
| Haversine formula | utils/haversine.js:7-26 |
| Favorites notifications | models/Favorite.js:17-18 |
| Farmer workers | workers/FarmerDemandWorker.js, FarmerSuggestionWorker.js |

### Требует дополнительной валидации:
| Область | Что нужно |
|---------|-----------|
| Поиск | explain() + latency metrics |
| Чаты | conversations count per user |
| Redis | production config audit |
| Frontend | profiling данные |

### Немедленные рекомендации:
1. ⚠️ Убрать дублирующийся индекс sellerTelegramId
2. ℹ️ Проверить production Redis config

### Следующие шаги для завершения аудита:
1. Выполнить MongoDB explain() для search queries
2. Собрать latency metrics из production
3. Подсчитать conversations/orders per user
4. Провести frontend profiling

---

*Отчёт v1.3 - предварительный, требует валидации метриками*
