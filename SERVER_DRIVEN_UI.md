# Server-Driven UI Architecture

## Overview

KETMAR Market uses **Server-Driven UI (SDUI)** to enable dynamic screen layouts controlled from the backend. This allows content teams to customize city experiences, seasonal showcases, and promotional campaigns without frontend deployments.

## Architecture Components

### 1. MongoDB Models

#### **City Model** (`models/City.js`)

Stores city-specific configurations:

```javascript
{
  code: 'brest',                    // Unique city identifier
  name: 'Брест',
  displayName: 'Брест',
  timezone: 'Europe/Minsk',
  isActive: true,
  theme: {
    primaryColor: '#2563eb',
    accentColor: '#f59e0b'
  },
  features: {
    liveSpots: true,
    seasonalShowcases: true,
    premiumListings: true
  },
  metadata: {
    population: 350000,
    region: 'Брестская область'
  }
}
```

#### **CityLayout Model** (`models/CityLayout.js`)

Defines block-based layouts for screens:

```javascript
{
  cityCode: 'brest',
  screen: 'home',                   // home | seasonal | category | search
  variant: 'default',               // default | compact | expanded | march8
  seasonCode: null,                 // Optional season filter
  isActive: true,
  blocks: [
    {
      type: 'search_bar',
      order: 0,
      config: {
        placeholder: 'Поиск по объявлениям в Бресте',
        showFilters: true
      }
    },
    {
      type: 'hero_banner',
      order: 1,
      config: {
        slotId: 'brest_hero_main'
      }
    },
    {
      type: 'category_grid',
      order: 2,
      config: {
        title: 'Популярные категории',
        maxCategories: 12,
        layout: 'grid',
        columns: 3
      }
    },
    {
      type: 'ad_carousel',
      order: 3,
      config: {
        title: 'Популярное в Бресте',
        dataSource: 'trending',      // trending | season | category | nearby
        limit: 10,
        cityCode: 'brest'
      }
    }
  ]
}
```

#### **ContentSlot Model** (`models/ContentSlot.js`)

Stores dynamic content for banners:

```javascript
{
  slotId: 'brest_hero_main',
  type: 'hero_banner',
  isActive: true,
  data: {
    title: 'KETMAR Маркет — Брест',
    subtitle: 'Покупайте и продавайте с удовольствием',
    imageUrl: 'https://example.com/hero.jpg',
    link: '/categories',
    actionText: 'Все категории'
  }
}
```

### 2. Block Types

Available block types (`shared/types/layout.js`):

| Block Type | Purpose | Config Options |
|------------|---------|----------------|
| `search_bar` | Search input with filters | `placeholder`, `showFilters` |
| `hero_banner` | Hero image/banner | `slotId` (references ContentSlot) |
| `category_grid` | Category icons grid | `title`, `maxCategories`, `layout`, `columns` |
| `ad_carousel` | Horizontal ad scroll | `title`, `dataSource`, `limit`, `cityCode`, `seasonCode` |
| `promo_island` | Promotional block | `title`, `subtitle`, `seasonCode`, `actionText`, `actionUrl` |
| `seasonal_showcase` | Season-specific section | `seasonCode`, `title`, `limit` |
| `map_block` | Geolocation map view | `defaultZoom`, `centerLat`, `centerLng` |

### 3. API Endpoints

#### **GET /api/layout**

Fetch layout configuration:

```http
GET /api/layout?cityCode=brest&screen=home&variant=default
```

Response:
```json
{
  "cityCode": "brest",
  "screen": "home",
  "variant": "default",
  "blocks": [
    {
      "type": "search_bar",
      "order": 0,
      "config": { "placeholder": "Поиск по Бресту" }
    },
    {
      "type": "hero_banner",
      "order": 1,
      "config": { "slotId": "brest_hero_main" }
    }
  ]
}
```

#### **GET /api/content/slot/:slotId**

Fetch banner content:

```http
GET /api/content/slot/brest_hero_main
```

Response:
```json
{
  "slotId": "brest_hero_main",
  "type": "hero_banner",
  "data": {
    "title": "KETMAR Маркет — Брест",
    "subtitle": "Покупайте и продавайте",
    "imageUrl": "https://example.com/hero.jpg",
    "link": "/categories",
    "actionText": "Все категории"
  }
}
```

#### **GET /api/ads/trending**

Fetch trending ads for a city:

```http
GET /api/ads/trending?cityCode=brest&limit=10&offset=0
```

Response:
```json
{
  "items": [ /* Ad objects */ ],
  "total": 42,
  "hasMore": true
}
```

#### **POST /api/users/initData**

MiniApp authentication with city detection:

```http
POST /api/users/initData
Content-Type: application/json

{
  "geoCoordinates": { "lat": 52.09, "lng": 23.68 },
  "preferredCity": "brest"
}
```

Response:
```json
{
  "user": {
    "id": "...",
    "telegramId": 123456,
    "username": "ivan",
    "firstName": "Иван"
  },
  "cityCode": "brest",
  "timestamp": "2025-11-23T12:00:00Z"
}
```

### 4. City Auto-Detection

**cityResolver.js** algorithm (`utils/cityResolver.js`):

1. **Preferred City**: If user explicitly selects city → use it
2. **Geolocation**: Match coordinates to city boundaries using Haversine distance
3. **Telegram Language**: Map `language_code` to city (be→brest, ru→minsk)
4. **Fallback**: Default to `brest`

```javascript
import { resolveCityCode } from '../utils/cityResolver.js';

const cityCode = await resolveCityCode({
  initData: req.telegramInitData,
  geoCoordinates: { lat: 52.09, lng: 23.68 },
  preferredCity: 'brest'
});
```

### 5. Frontend Integration (MiniApp)

#### **RenderBlocks Component**

```jsx
// miniapp/src/layout/RenderBlocks.jsx
import HeroBanner from './blocks/HeroBanner';
import CategoryGrid from './blocks/CategoryGrid';
import AdCarousel from './blocks/AdCarousel';

const BLOCK_COMPONENTS = {
  search_bar: SearchBar,
  hero_banner: HeroBanner,
  category_grid: CategoryGrid,
  ad_carousel: AdCarousel,
  promo_island: PromoBanner,
};

export function RenderBlocks({ blocks }) {
  return blocks
    .sort((a, b) => a.order - b.order)
    .map(block => {
      const Component = BLOCK_COMPONENTS[block.type];
      return <Component key={block.order} config={block.config} />;
    });
}
```

#### **Usage in FeedPage**

```jsx
// miniapp/src/pages/FeedPage.jsx
import { useQuery } from '@tanstack/react-query';
import { RenderBlocks } from '../layout/RenderBlocks';

export default function FeedPage() {
  const cityCode = useCityStore(state => state.cityCode);
  
  const { data: layout } = useQuery({
    queryKey: ['/api/layout', { cityCode, screen: 'home', variant: 'default' }]
  });

  return (
    <div>
      {layout?.blocks && <RenderBlocks blocks={layout.blocks} />}
    </div>
  );
}
```

## Use Cases

### 1. City-Specific Layouts

**Brest**: Compact layout with 3-column category grid
**Minsk**: Expanded layout with 4-column grid, more trending items
**Grodno**: Standard layout, no promo islands

### 2. Seasonal Campaigns

**March 8 (Women's Day)**:
- Custom hero banner
- Filter ads by `seasonCode: 'march8'`
- Category shortcuts: flowers, cosmetics, jewelry

**Farmers Market (Spring)**:
- Show `seasonCode: 'farmers_market'` ads
- Map block with farm locations
- Category focus: vegetables, dairy, honey

### 3. Deep Links from Bot

Bot command → MiniApp deep link:

```javascript
// Telegram Bot
bot.command('march8', ctx => {
  ctx.reply('🎁 Подарки к 8 марта', {
    reply_markup: {
      inline_keyboard: [[{
        text: 'Открыть ярмарку',
        url: 'https://t.me/YourBot/miniapp?startapp=season_march8'
      }]]
    }
  });
});
```

MiniApp route handler:

```jsx
// Parse startapp param
const searchParams = new URLSearchParams(window.location.search);
const startApp = searchParams.get('tgWebAppStartParam');

if (startApp?.startsWith('season_')) {
  const seasonCode = startApp.replace('season_', '');
  // Fetch layout with seasonCode
}
```

## Data Flow

```
┌─────────────┐
│  Telegram   │
│  MiniApp    │
└──────┬──────┘
       │ 1. POST /api/users/initData
       │    (with geoCoordinates)
       │
       ▼
┌─────────────────┐
│ cityResolver.js │ ← Haversine distance
│ (Auto-detect)   │   to city boundaries
└──────┬──────────┘
       │ cityCode: 'brest'
       │
       ▼
┌─────────────────┐
│ GET /api/layout │ ← CityLayout.findOne({
│ ?cityCode=brest │   cityCode, screen, variant
│ &screen=home    │ })
└──────┬──────────┘
       │ blocks: [...]
       │
       ▼
┌─────────────────┐
│  RenderBlocks   │ ← Map block.type to
│  Component      │   React components
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ hero_banner     │ ← GET /api/content/slot/:slotId
│ ad_carousel     │ ← GET /api/ads/trending?cityCode=brest
│ category_grid   │ ← GET /api/categories
└─────────────────┘
```

## Database Seeding

Run seed scripts to populate initial data:

```bash
# Seed cities
node scripts/seedCities.js

# Seed layouts
node scripts/seedLayouts.js

# Seed content slots (banners)
node scripts/seedSlots.js
```

## Future Enhancements

1. **A/B Testing**: Multiple variants per screen, track conversion
2. **Personalization**: User-specific blocks (favorites, recent searches)
3. **Analytics**: Track block impressions, click-through rates
4. **Admin Panel**: Visual layout builder with drag-drop
5. **Caching**: Redis cache for frequent layout requests
6. **Preview Mode**: Test layouts before publishing

## References

- MongoDB Models: `models/City.js`, `models/CityLayout.js`, `models/ContentSlot.js`
- API Routes: `api/routes/layout.js`, `api/routes/content.js`
- City Resolver: `utils/cityResolver.js`
- Shared Types: `shared/types/layout.js`
- Seed Scripts: `scripts/seedCities.js`, `scripts/seedLayouts.js`, `scripts/seedSlots.js`
