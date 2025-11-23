# KufarCode Android (Compose)

Нативный клиент KUFAR-CODE на Kotlin + Jetpack Compose с Server-Driven UI.

## Требования
- Android Studio Iguana или выше
- JDK 17
- Android Gradle Plugin 8.3+
- Min SDK 24, Target SDK 34

## Сборка и запуск
1. Откройте папку `android` в Android Studio.
2. Задайте адрес backend в `app/build.gradle` через `BuildConfig.BASE_URL` или замените в файле.
3. Запустите сборку/эмулятор из Android Studio (Run > Run 'app').

## Структура
- `app/core` — тема, DI, общие утилиты
- `app/domain` — модели, интерфейсы репозиториев, use-case
- `app/data` — DTO, API, реализации репозиториев
- `app/presentation` — экраны Compose, ViewModel, навигация

## Основные возможности
- Hilt для DI, Navigation Compose для навигации
- Server-Driven UI через `LayoutRenderer`
- Выбор города и сохранение в DataStore
- Геопоиск/рекомендации заготовлены в use-case и репозиториях
- Заглушки для карты и избранного

## Тесты
Запуск unit-тестов (примерные заготовки):
```
./gradlew test
```
