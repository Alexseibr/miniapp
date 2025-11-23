# KUFAR-CODE Mobile

Нативные клиенты для Android (Kotlin + Jetpack Compose) и iOS (Swift + SwiftUI), использующие существующий backend и Server-Driven UI из `/api/layout`.

## Структура
```
mobile/
  android/   # Android приложение (Gradle, Compose)
  ios/       # iOS приложение (Swift Package + SwiftUI)
```

## Настройка окружения

- Общий параметр: `BASE_URL` — корневой адрес backend (например, `https://api.example.com`).
- API, используемые обоими клиентами:
  - `GET /api/layout?cityCode=&screen=`
  - `GET /api/content/slot/:slotId`
  - `GET /api/ads/trending?cityCode=`
  - `GET /api/ads/nearby?lat=&lng=&radiusKm=&categoryId=`
  - `GET /api/ads?seasonCode=`
  - `GET /api/city/:code`

## Сборка Android
1. Откройте `mobile/android` в Android Studio (Arctic Fox+).
2. В `local.properties` или через переменную среды задайте `BASE_URL` (по умолчанию `http://10.0.2.2:3000`).
3. Запустите `app` конфигурацию. Gradle соберёт Jetpack Compose приложение.

## Сборка iOS
1. Откройте папку `mobile/ios` в Xcode 15+ или через Swift Package в новом проекте.
2. В `AppConfig.swift` измените `baseURL` при необходимости.
3. Соберите и запустите на симуляторе/устройстве. SwiftUI используется без сторонних зависимостей.

## Основные возможности
- Загрузка layout главного экрана и отрисовка через рендерер блоков.
- Поддержка многогородовости и темизации по городу.
- Запросы рекомендаций и геопоиска.
- Заглушки для deep-link схемы `kufarcode://open/...`.
- Локальное хранение избранного и выбранного города (SharedPreferences/UserDefaults).
