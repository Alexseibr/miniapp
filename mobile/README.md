# KETMAR Market Mobile (React Native + Expo)

Полноценное мобильное приложение KETMAR Market для iOS и Android. Основано на Expo + React Native + TypeScript. Навигация на базе React Navigation (stack + bottom tabs), состояние — Zustand, HTTP-клиент — Axios.

## Быстрый старт

```bash
cd mobile
npm install
npm start # или npx expo start
```

Запуск на устройствах:
- `npm run android` — открытие Expo DevTools и запуск на эмулятор/устройство Android.
- `npm run ios` — запуск на iOS (требуется macOS/Xcode или Expo Go на устройстве).
- `npm run web` — веб-просмотр через Expo.

## Переменные окружения

Expo автоматически прокидывает переменные `EXPO_PUBLIC_*`. Базовый URL API по умолчанию берётся из `app.json` (`extra.apiBaseUrl`) и соответствует документации `docs/API.md` — `https://your-domain.com/api`.

Можно переопределить:
```
EXPO_PUBLIC_API_BASE_URL=https://your-domain.com/api
```

## Основные возможности
- Онбординг, вход по номеру телефона (см. `POST /api/mobile/v1/auth/request-code` и `/confirm-code`).
- JWT сохраняется в AsyncStorage и добавляется в заголовки всех защищённых запросов.
- Лента объявлений с геофильтром (`GET /api/ads/search`, `GET /api/ads/nearby`, `GET /api/ads/live-spots`).
- Детали объявления, добавление в избранное (`/favorites`).
- Создание объявления (`POST /api/ads`) с шагом выбора локации.
- Карта объявлений вокруг пользователя (react-native-maps + geo endpoints).
- Профиль пользователя (`GET/PATCH /users/me`), выход, быстрый переход в Telegram-бот `@KetmarM_bot`.
- Заглушки под push-уведомления (`/devices/register`, `/devices/:id/geo`) для будущей интеграции notification-service.

## Структура
```
/mobile
  App.tsx
  app.json
  babel.config.js
  src/
    api/           // axios-клиенты по разделам API
    components/    // UI и карточки
    navigation/    // Root/Auth/App навигаторы
    screens/       // экраны приложения
    services/      // гео, хранилище, telegram/push helpers
    store/         // Zustand-stores (auth, ads, geo, ui)
    types/         // Общие типы ответов
```

## Ссылки на API
- Базовые эндпоинты: см. `docs/API.md`.
- Расширение для mobile: `docs/mobile-api.md` (`/api/mobile/v1/...`).
- Геопоиск и расстояние в ответах описаны в файле `ГЕОПОИСК_ГОТОВ.md` (например, `GET /api/ads/search?lat=...&maxDistanceKm=...`).

## Дополнительно
- Тёмная тема по умолчанию; акцент — неоновый (`#00f5d4`).
- Компоненты спроектированы так, чтобы добавить skeleton loaders и полноценную загрузку фото по мере развития backend.
- TODO в коде указывают места, где требуется уточнить GEO endpoints из отсутствующего `docs/GEO_API_DOCUMENTATION.md`.
