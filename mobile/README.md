# Kufar Code Mobile

Мобильная версия KUFAR-CODE — mobile-first SPA на React + Vite с Server-Driven UI.

## Запуск

```bash
cd mobile
npm install
npm run dev
```

Ожидается переменная окружения:

- `VITE_API_BASE_URL` — базовый URL API backend (например, `http://localhost:3000`).

## Архитектура

- `src/pages/HomePage.tsx` — главная, тянет layout `/api/layout?cityCode={city}&screen=home` и фолбэк на `global`.
- `src/hooks/useResolvedCity.ts` — определение `cityCode` (URL ?city=, localStorage, поддомен, fallback `global`).
- `src/components/layout/LayoutRenderer.tsx` — рендер S-DUI блоков (`hero_banner`, `category_grid`, `ad_list`, `banner`, `map`).
- `src/api` — тонкие врапперы для `/api/layout`, `/api/ads`, `/api/city`.
- `src/theme/ThemeProvider.tsx` — хранит тему города, меняет `--color-primary`.
- Tailwind настроен под мобильный контейнер `max-width: 600px` и нижнюю навигацию.

## Поведение

- Если layout для города не найден → запрашивается `cityCode=global`.
- Блоки `ad_list` подтягивают данные по `source` (`trending_city`, `trending_global`, `nearby`, `season_*`).
- Определённый `cityCode` сохраняется в `localStorage` и читается при следующем визите.
