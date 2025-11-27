# Codebase Analysis

## Backend (server)
- **Entry point**: `server/index.ts` configures an Express app with JSON/body parsing, captures raw request bodies, and attaches a timing/logging middleware that logs API responses (truncated to 80 characters) alongside captured JSON payloads for `/api` routes before starting the HTTP server on `PORT` (default 5000).【F:server/index.ts†L1-L64】
- **Error handling & dev tooling**: After route registration, errors are normalized into `{ message }` responses, and the server conditionally enables Vite dev middleware in development while serving static assets in production, binding to `0.0.0.0` with `reusePort` for resilience.【F:server/index.ts†L66-L90】
- **Routes & domain logic**: `server/routes.ts` mounts API routes under `/api` (via `registerRoutes`), seeds a request-level `user` object from headers, and exposes geo feed, analytics, and fair management endpoints. Geo feed endpoints validate coordinates before delegating to `listNearbyAds`, while analytics endpoints compute shop/listing KPIs such as price position. Admin routes cover fair CRUD, top-slot claims, participation toggles, and participation summaries, applying default role/geo rules where absent.【F:server/routes.ts†L1-L125】【F:server/routes.ts†L147-L228】

## Frontend (client)
- **Routing shell**: `client/src/App.tsx` wraps the app in TanStack Query and tooltip/toast providers, then defines a `wouter` switch with routes for home, dashboard, product/category lists, nearby feed, favorites, admin login/auth callbacks, admin panel, and a catch-all 404 page, keeping navigation compact and declarative.【F:client/src/App.tsx†L1-L36】

## Observations
- The backend currently stubs authentication by reading `x-user-id`/`x-user-role` headers, which simplifies testing but should be replaced with real auth for production usage.【F:server/routes.ts†L41-L45】
- Logging captures JSON response bodies for `/api` routes, which aids debugging but may need redaction controls for sensitive data and could benefit from structured logging at higher volumes.【F:server/index.ts†L19-L44】

## Функционал
- **Витрина объявлений по гео**: endpoint `/api/ads/near` принимает координаты, ограничивает радиус, пагинирует через курсор и возвращает сортированный список ближайших объявлений с расстоянием и шагами радиуса, используя `listNearbyAds`.【F:server/routes.ts†L48-L81】【F:server/geoFeedService.ts†L1-L67】
- **Аналитика магазина и объявления**: API `/api/shops/:shopId/analytics/overview` и `/api/shops/:shopId/listings/:listingId/analytics` собирают просмотры, избранное, контакты и географию по мок-данным, строят дневные серии и топы объявлений, вычисляют рейтинги/жалобы и распределение по дистанциям.【F:server/routes.ts†L83-L101】【F:server/analyticsService.ts†L18-L206】
- **Позиционирование цены**: `/api/shops/:shopId/listings/:listingId/price-position` сопоставляет цену объявления со средними/медианными ценами рынка по региону и выдает рекомендации (ниже/вокруг/выше рынка).【F:server/routes.ts†L103-L112】【F:server/analyticsService.ts†L260-L308】
- **Ярмарки**: административные маршруты позволяют создавать/редактировать ярмарки с гео-правилами и ролями, продавцы могут вступать/выходить из ярмарок, получать доступные ярмарки по роли и локации, а также занимать топ-слот зоны; публичные маршруты возвращают активные ярмарки, слоты и фид по зоне. Всё использует расчёт зон `getZoneId` и динамические слоты в `fairsService`.【F:server/routes.ts†L123-L220】【F:server/fairsService.ts†L1-L176】
- **Клиентские маршруты**: мини-приложение на `wouter` связывает домашнюю страницу, дашборд, упрощённые списки товаров/категорий, ленту рядом, избранное и административный вход/панель в один провайдер QueryClient, обеспечивая готовность к запросам API и уведомлениям/toast'ам.【F:client/src/App.tsx†L1-L42】

## Замеченные проблемы и риски
- **Краш после обработки ошибки**: глобальный обработчик Express отправляет `{ message }`, но затем выбрасывает ошибку (`throw err`), что приведёт к завершению процесса при любой серверной ошибке вместо безопасного логирования и продолжения работы. Уберите `throw` или логируйте асинхронно, иначе API может упасть под нагрузкой.【F:server/index.ts†L52-L58】
- **Нет валидации тела в топ-слоте**: в `/api/seller/fairs/:fairId/top-slot/claim` поля `lat`/`lng` берутся из `req.body` без проверки типа/наличия. При пустых или нечисловых значениях `getZoneId` и `claimTopSlotForSeller` получат `NaN`, что даст некорректный слот или исключение. Добавьте проверку и ответы 400.【F:server/routes.ts†L204-L217】
- **Некорректные даты без проверки**: `parseDateRange` слепо парсит `from`/`to` в `Date`, поэтому невалидные строки превратятся в `Invalid Date` и испортят фильтрацию аналитики; стоит валидировать формат и возвращать 400 при ошибке.【F:server/routes.ts†L30-L36】【F:server/routes.ts†L83-L112】
- **Фиктивная аутентификация**: контекст пользователя берётся из заголовков с дефолтом `seller-1`/`SELLER`, что даёт любому клиенту доступ к административным и ярмарочным маршрутам. Требуется реальный auth/authorization перед продакшн-запуском.【F:server/routes.ts†L41-L46】【F:server/routes.ts†L123-L220】
