# Мультивалютность и мультиязычность

Этот файл описывает минимальную архитектуру для запуска Ketmar Market в любой стране без смешивания лент.

## Слоёная модель
- **CountryConfig** — единый источник параметров страны (валюта по умолчанию, список поддерживаемых, локаль и fallback).
- **REGION_PRESETS** — быстрые пресеты для привязки `countryCode → currency → locale`.
- **resolveUserRegionContext** — сервис определения региона по приоритетам источников (профиль → гео → IP → Accept-Language → язык Telegram).
- **formatPrice** — единая утилита вывода цен (на базе `Intl.NumberFormat`).

## Данные
- Объявление хранит исходную цену продавца: `priceValue`, `priceCurrency`, `countryCode` и геопривязку.
- Пользователь хранит базовый контекст: `countryCode`, `preferredCurrency`, `preferredLocale`.
- Категории и системные тексты переводятся по ключам (`categories.FARM_VEGETABLES.title` и т.п.) из файлов `locales/<lang>/*.json`.

## Потоки
1. На старте MiniApp/Web вызываем `resolveUserRegionContext`, сохраняем `countryCode`, `currency`, `locale` в сессии/сторе.
2. При создании объявления подставляем `priceCurrency` и `countryCode` из текущего контекста.
3. Ленты фильтруем по геозонам (а значит по `countryCode`), язык UI не влияет на логику выдачи.
4. Все цены выводим через `formatPrice`, все тексты — через i18n-файлы.

## Локали
- Структура `locales/<language>/<namespace>.json` используется и для фронтенда, и для серверных сообщений.
- Fallback: если язык не поддерживается, используем `en` и валюту/локаль из `REGION_PRESETS.DEFAULT`.
