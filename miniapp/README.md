# MiniApp (Telegram WebApp)

Фронтенд для Telegram WebApp: каталог фермерских продуктов, корзина и личный кабинет. Собирается на Vite + React.

## Установка
1. Перейдите в папку `miniapp`.
2. Скопируйте `.env.example` в `.env` и заполните значения.
3. Установите зависимости: `npm install`.

## Пример `.env`
```bash
VITE_API_BASE_URL=http://localhost:5000/api
VITE_TELEGRAM_BOT_NAME=FermerBrest_Bot
```

## Запуск
- **Dev**: `npm run dev` — Vite dev server.
- **Prod build**: `npm run build`.
- **Preview**: `npm run preview` — локальная проверка production-сборки.

## Структура папок
```
miniapp/
  src/              # Компоненты, страницы, store
  vite.config.ts    # Конфигурация Vite
  .env.example      # Шаблон переменных окружения
  package.json      # Скрипты и зависимости MiniApp
```

> Подсказка: храните общие типы в `shared/` монорепо, а API-клиент — в `src/api`.
