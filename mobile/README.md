# Kufar Code Mobile

Мобильная web-версия (mobile-first SPA) проекта Kufar Code на React + Vite.

## Запуск

```bash
cd mobile
npm install
npm run dev
```

Переменные окружения:
- `VITE_API_BASE_URL` — базовый URL для API (по умолчанию `/api`).

## Определение города
- Параметр `?city=` в URL имеет приоритет и сохраняется в `localStorage`.
- Если параметра нет — читаем сохранённое значение из `localStorage`.
- Далее пытаемся определить город по поддомену (`brest.example.com`).
- Фолбэк — `cityCode = "global"`.

При запросе layout для `cityCode` при ошибке 404 автоматически запрашивается `cityCode=global`.

## Структура
Основные директории:
- `src/pages` — страницы (Home, City, Favorites и др.)
- `src/hooks` — хук `useResolvedCity` для определения города
- `src/api` — обёртки API (layout, ads, city)
- `src/components/layout` — LayoutRenderer и нижняя навигация
- `src/components/blocks` — UI-блоки Server-Driven UI
- `src/theme` — ThemeProvider с городскими темами
