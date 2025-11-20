# SSR и SEO для "Куфор-Код" (Next.js)

## Архитектура
- В директории `frontend/` развёрнут Next.js с SSR для ключевых страниц: главная, объявления, категории, поиск, статика (/about, /contacts) и базовая оболочка для /login, /account, /admin, /chat.
- Данные подтягиваются с backend API через `process.env.API_BASE_URL` (по умолчанию `http://localhost:5000/api`).
- Канонические ссылки, OpenGraph, Twitter cards, hreflang (RU по умолчанию) и JSON-LD (Product/Offer) формируются на сервере.

## Запуск
1. Установить зависимости фронта:
   ```bash
   cd frontend
   npm install
   ```
2. Запустить dev-сервер:
   ```bash
   npm run dev
   ```
   или сборка/прод:
   ```bash
   npm run build
   npm run start
   ```
3. Переменные окружения:
   - `SITE_URL` — базовый домен для canonical/OG/hreflang (пример: `https://example.com`).
   - `API_BASE_URL` — адрес backend API (пример: `https://<YOUR_DOMAIN>/api`).

## Проверка SEO-эндпоинтов
- `https://<SITE_URL>/sitemap.xml` — динамически собирается из главной, статических страниц, категорий (по данным объявлений) и последних объявлений.
- `https://<SITE_URL>/robots.txt` — отдаёт правила индексации и ссылку на sitemap.

## Обработка 404
- Страницы объявлений: если `/ads/:id` возвращает 404 или отсутствует ID, Next.js отвечает `notFound` и отдаёт стандартную 404.

## Структурированные данные
- На странице объявления вставляется JSON-LD (Product + Offer) с названием, ценой, ссылкой, описанием и изображениями.
