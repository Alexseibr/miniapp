# Codex Prompt — MiniApp Stage 1 (Architecture & Project Skeleton)

ПРОМПТ ДЛЯ CODEX (готовый к вставке)

Вот ТЗ для Telegram MiniApp UI проекта KETMAR Market.

Сгенерируй ЭТАП 1:
— создать проект Vite + React + TypeScript,
— настроить Telegram WebApp SDK,
— создать структуру папок,
— создать App.tsx с базовой маршрутизацией и проверкой initData,
— прописать TailwindCSS,
— создать первые страницы HomePage и CategoryPage (пустые компоненты).

Работай строго по ТЗ.
Выдавай файлы полностью, с путями.

---

## 1. Цель MiniApp

MiniApp должен предоставлять:

- просмотр объявлений с фильтрами;
- поиск;
- переход по категориям;
- страницу объявления;
- форму заказа;
- личный кабинет покупателя;
- личный кабинет продавца;
- карту «рядом со мной» (геопоиск);
- сезонные ярмарки (например, «8 марта — тюльпаны»);
- избранные объявления (сердечко);
- уведомления об изменении цены/статуса;
- мини-форму подачи объявлений (упрощённый вариант).

## 2. Технологический стек MiniApp

- **Frontend:** React + Vite
- **State:** Zustand (минималистично)
- **HTTP:** axios
- **Router:** React Router 6
- **Telegram API:** `window.Telegram.WebApp` — инициализация, `WebApp.initData`, `WebApp.ready()`, `WebApp.expand()`
- **UI:** TailwindCSS, Headless UI (опционально)
- **Сборка:** Vite + React, артефакты в `/dist`

## 3. Структура проекта (создать все папки и файлы)

```
miniapp/
├── index.html
├── vite.config.js
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── router.jsx
│   ├── api/
│   │   └── api.js
│   ├── store/
│   │   ├── userStore.js
│   │   ├── adsStore.js
│   │   └── uiStore.js
│   ├── components/
│   │   ├── AdCard.jsx
│   │   ├── CategoryCard.jsx
│   │   ├── Navbar.jsx
│   │   ├── SearchBar.jsx
│   │   └── MapComponent.jsx (пока заглушка)
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Categories.jsx
│   │   ├── AdsList.jsx
│   │   ├── AdView.jsx
│   │   ├── Favorites.jsx
│   │   ├── Orders.jsx
│   │   ├── Profile.jsx
│   │   ├── SellerDashboard.jsx
│   │   ├── Season.jsx
│   │   └── NearMe.jsx
│   ├── utils/
│   │   ├── tg.js
│   │   └── distance.js
│   └── styles/
│       └── globals.css
└── README.md
```

## 4. API MiniApp

`src/api/api.js` должен экспортировать:

- `getCategories()`
- `getAds(options)`
- `getAd(id)`
- `getSeasons()`
- `getSeasonAds(code)`
- `getFavorites()`
- `toggleFavorite(id)`
- `getOrders()`
- `createOrder(payload)`
- `getUser()`
- `syncTelegramProfile(initData)`
- `getNearByAds(lat, lng, radius)`

## 5. Авторизация MiniApp (Telegram initData)

- Инициализировать `window.Telegram.WebApp`: `WebApp.ready(); WebApp.expand();`
- Получить `initData` и отправить на backend: `POST /api/auth/telegram` с `{ initData }`
- Backend возвращает `{ user, token }`, сохранить JWT в Zustand и localStorage.

## 6. Главная страница

Содержит:
- баннеры сезонов (`/api/seasons`);
- плитку категорий;
- строку поиска (`<SearchBar />`);
- список «рекомендованное» или «свежее» (`<AdCard />`).

## 7. Навигация MiniApp

Маршруты:
- `/` → Home
- `/categories` → Categories
- `/category/:id` → AdsList
- `/ad/:id` → AdView
- `/favorites` → Favorites
- `/orders` → Orders
- `/profile` → Profile
- `/seller` → SellerDashboard
- `/season/:code` → Season
- `/nearme` → NearMe

## 8. Избранное

- Запросы: `POST /api/favorites/toggle`
- Сердечко на объявлениях
- Синхронизация списка избранного в store, мини-toast при изменении

## 9. Геопоиск «рядом со мной»

- Запрос геолокации `navigator.geolocation.getCurrentPosition`
- Backend: `GET /api/ads/nearme?lat=..&lng=..&radius=5000`
- Показ списка объявлений, заглушки карты, расчёт расстояния через `utils/distance.js`

## 10. Страница сезона

- Баннер
- Блоки «Цветы», «Наборы», «Десерты»
- Спец-фильтры: доставка, тип букета, цена
- Live-точки (`isLiveSpot=true`) на карте

## 11. Продавец MiniApp

- Seller Dashboard: список объявлений, «Создать объявление», статистика
- Быстрые действия: скрыть, продлить, изменить цену, обновить фото

## 12. Корзина и заказы

- Мини-корзина с добавлением из AdView
- Orders: отправка `POST /api/orders`

## 13. Mock Mode

В `api.js` предусмотреть режим `VITE_MOCK === "1"` для возврата фейковых данных.

## 14. Скрипты запуска

В `package.json`:

```
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

## 15. README (MiniApp)

Добавить раздел:
- как запускать локально;
- деплой на GitHub Pages / Vercel;
- пример кнопки в боте:
  ```
  bot.sendMessage(chatId, "Открыть MiniApp", {
    reply_markup: {
      inline_keyboard: [[
        { text: "Открыть", web_app: { url: "https://ваш-домен/miniapp" } }
      ]]
    }
  })
  ```
