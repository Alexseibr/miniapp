# KETMAR Market

Geo-focused multi-platform marketplace for Telegram with real-time analytics, AI-powered features, and comprehensive anti-fraud system.

[![Telegram Bot](https://img.shields.io/badge/Telegram-@KetmarM__bot-blue?logo=telegram)](https://t.me/KetmarM_bot)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green?logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)

## Overview

KETMAR Market is a comprehensive marketplace platform featuring:
- **Telegram MiniApp** - Native mobile experience
- **Web Browser Support** - Responsive web interface  
- **Mobile WebView** - Embedded app support
- **Admin Panel** - Full management dashboard
- **Telegram Bot** - Interactive bot interface

## Key Features

### Marketplace Core
- **Geo-first Feed** - Radius-based listings with distance display
- **Hierarchical Categories** - Multi-level system with 3D WebP icons
- **Smart Search** - Fuzzy matching, suggestions, hot searches
- **Real-time Chat** - WebSocket buyer-seller messaging
- **4-Step Ad Wizard** - Guided listing creation with auto-geolocation

### Multi-Platform Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Platform Adapters                        │
├──────────────────┬──────────────────┬──────────────────────┤
│  TelegramAdapter │   WebAdapter     │  MobileAppAdapter    │
│  - initData auth │   - SMS auth     │  - Bridge auth       │
│  - haptic API    │   - vibrate API  │  - native haptic     │
│  - WebApp theme  │   - CSS vars     │  - app theme         │
└──────────────────┴──────────────────┴──────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Unified API     │
                    │   (Express.js)    │
                    └───────────────────┘
```

### Seller Tools
- **Seller Stores** - Dedicated storefronts with profiles
- **PRO Analytics** - Daily stats, KPIs, conversion funnels, geo-analysis
- **Dynamic Pricing** - AI-powered Uber-style surge pricing
- **Seller Digital Twin** - AI business assistant
- **Campaign Tracking** - Marketing performance analytics

### Farmer Module
- **Farmer Cabinet** - Agricultural seller dashboard
- **Bulk Upload** - Quick multi-product listing
- **Demand Analytics** - Local market insights
- **Unit Types** - kg, pieces, liters, bundles

### AI Features
- **Digital Twin** - Personalized shopping assistant (MEGA-PROMPT 14.0)
- **Smart Recommendations** - TikTok-style personalized feed (MEGA-PROMPT 17.0)
- **Dynamic Pricing** - Market position analysis (MEGA-PROMPT 13.0)
- **Seller Twin** - Business intelligence assistant (MEGA-PROMPT 15.0)
- **Content Moderation** - Automated listing review

### Rating & Anti-Fraud System
- **Contact Tracking** - Buyer-seller interaction logging
- **Rating System** - 1-5 stars with reason codes
- **Fraud Detection** - Automatic suspicious activity flagging
- **Admin Dashboard** - Fraud analytics and management

```javascript
// Reason codes for low ratings
['no_response', 'wrong_price', 'wrong_description', 'fake', 'rude']

// Fraud detection heuristics
- Low rating threshold: avg <= 2.5 with 3+ votes
- Fraud report threshold: 2+ fake reports
- Auto-hide: 5+ votes with avg <= 2.0
```

### Neon UI Kit (Matrix/Cyberpunk Design)
Custom component library for analytics visualization:
- `NeonCard`, `NeonStatCard` - Glass morphism cards
- `NeonHistogram`, `NeonLineChart` - Animated charts
- `NeonHeatmap`, `NeonDensityGrid` - Geo-analytics
- `NeonRatingForm`, `NeonRatingDisplay` - Rating UI

Demo available at `/miniapp/neon-demo`

## Tech Stack

### Backend
| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ (ES Modules) |
| Framework | Express.js |
| Database | MongoDB Atlas (Mongoose) |
| Queue | BullMQ + Redis (optional) |
| Bot | Telegraf |
| Auth | JWT + Telegram initData + SMS |
| Media | Google Cloud Storage |
| Images | Sharp (WebP optimization) |
| Geocoding | Nominatim OSM |

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Routing | React Router v6 |
| State | Zustand + TanStack Query v5 |
| UI | Tailwind CSS + shadcn/ui |
| Maps | Leaflet + React-Leaflet |
| Animations | Framer Motion |

## Project Structure

```
ketmar-market/
├── api/                    # REST API (Express.js)
│   ├── routes/            # 40+ API endpoints
│   │   ├── ads.js         # Listings CRUD (2289 lines)
│   │   ├── auth.js        # Authentication
│   │   ├── geo.js         # Geolocation
│   │   ├── rating.js      # Rating system
│   │   └── ...
│   └── middleware/        # Auth, validation
├── bot/                    # Telegram bot (Telegraf)
│   ├── commands/          # Bot commands
│   └── handlers/          # Callbacks
├── client/                 # Admin Panel (React)
├── miniapp/               # MiniApp (React)
│   └── src/
│       ├── platform/      # Platform Adapters
│       ├── pages/         # 50+ pages (lazy loaded)
│       ├── components/    # UI components
│       │   └── ui/neon/   # Neon UI Kit
│       └── store/         # Zustand stores
├── models/                # MongoDB schemas (50+)
│   ├── Ad.js             # Main listing model (835 lines)
│   ├── User.js           # User with seller rating
│   ├── ContactEvent.js   # Rating contact tracking
│   ├── AdFeedback.js     # Rating feedback
│   └── ...
├── services/              # Business logic
│   ├── auth/             # AuthService
│   ├── geo/              # GeoEngine
│   ├── queue/            # BullMQ queues (5)
│   ├── ai/               # AI services
│   └── RatingService.js  # Rating aggregation
├── workers/               # Background jobs (14)
└── index.js              # Entry point
```

## API Endpoints

### Ads
```
GET    /api/ads              # List with filters, geo, pagination
GET    /api/ads/:id          # Ad details
POST   /api/ads              # Create ad
PUT    /api/ads/:id          # Update ad
DELETE /api/ads/:id          # Delete ad
GET    /api/ads/nearby       # Geo-search ($geoNear)
GET    /api/ads/my           # User's listings
POST   /api/ads/:id/extend   # Extend validity
```

### Authentication
```
POST   /auth/telegram           # Telegram initData login
POST   /auth/telegram-init      # With phone linking
POST   /auth/sms/request        # Request SMS code
POST   /auth/sms/verify         # Verify & get JWT
POST   /auth/link-phone/request # Link phone to account
POST   /auth/link-phone/verify  # Confirm & merge accounts
```

### Geolocation
```
GET    /api/geo/full-feed       # Feed with clusters, AI hints
GET    /api/geo/farmers         # Farmers nearby
GET    /api/geo/hotspots        # Demand/supply hotspots
POST   /api/geo/resolve         # Geocoding (Nominatim)
GET    /api/geo/preset-locations # Preset cities
```

### Rating & Anti-Fraud
```
POST   /api/rating/ads/:id/contact    # Log contact event
POST   /api/rating/ads/:id/feedback   # Submit rating (1-5)
GET    /api/rating/ads/:id/rating     # Get ad rating
GET    /api/rating/sellers/:id/rating # Get seller rating
GET    /api/rating/my/pending-feedback # Pending ratings

# Admin endpoints
GET    /api/admin/rating/fraud/overview        # Fraud dashboard
GET    /api/admin/rating/fraud/suspicious-ads   # Flagged ads
GET    /api/admin/rating/fraud/suspicious-sellers # Flagged sellers
POST   /api/admin/rating/fraud/ads/:id/clear-flags
POST   /api/admin/rating/fraud/ads/:id/mark-suspicious
```

### Analytics
```
GET    /api/seller/analytics/overview
GET    /api/seller/analytics/daily
GET    /api/seller/analytics/geo
GET    /api/campaign-analytics/campaigns
GET    /api/campaign-analytics/:code/overview
```

## Environment Variables

```env
# Database
MONGODB_URI=mongodb+srv://...

# Telegram
TELEGRAM_BOT_TOKEN=...

# Auth
SESSION_SECRET=...
JWT_SECRET=...

# Storage (Google Cloud)
GOOGLE_CLOUD_PROJECT=...
GCS_BUCKET_NAME=...
DEFAULT_OBJECT_STORAGE_BUCKET_ID=...

# Optional: Queues (enables BullMQ)
REDIS_URL=redis://...

# Optional: AI
OPENAI_API_KEY=...
```

## Quick Start

```bash
# Install dependencies
npm install

# Start development (API + MiniApp + Admin)
npm run dev

# Build for production
npm run build

# Seed database
npm run seed
```

Application endpoints:
- API Server: `http://localhost:5000`
- Admin Panel: `http://localhost:5000`
- MiniApp: `http://localhost:5000/miniapp`
- Telegram Bot: Webhook mode

## MiniApp Pages

50+ pages with lazy loading:

| Page | Path | Description |
|------|------|-------------|
| HomePage | `/` | Main feed with categories |
| FeedPage | `/feed` | Filtered ad listings |
| SearchPage | `/search` | Smart search |
| AdPage | `/ads/:id` | Ad details |
| CreateAdPage | `/create` | 4-step wizard |
| GeoMapPage | `/map` | Interactive map |
| FavoritesPage | `/favorites` | Saved ads |
| ProfilePage | `/profile` | User profile |
| ChatPage | `/chat/:id` | Messaging |
| SellerStorePage | `/store/:id` | Seller storefront |
| StoreProAnalyticsPage | `/seller/cabinet/pro-analytics` | PRO dashboard |
| TwinPage | `/twin` | AI assistant |
| DynamicPricingPage | `/dynamic-pricing` | Price analytics |
| CampaignPage | `/campaigns/:code` | Campaign view |
| NeonDemoPage | `/neon-demo` | UI Kit demo |

## Platform Detection

Automatic platform detection and adaptation:

```typescript
import { detectPlatform, createPlatformAdapter } from '@/platform';

// Detects: 'telegram' | 'web' | 'mobile_app'
const platform = detectPlatform();

// Creates appropriate adapter
const adapter = createPlatformAdapter();

// Platform-agnostic API
await adapter.requestLocation();
await adapter.getAuthToken();
adapter.hapticFeedback('impact');
adapter.showAlert('Success!');
```

## Database Indexes

```javascript
// Geo indexes
{ geo: '2dsphere' }
{ 'location.lat': 1, 'location.lng': 1 }

// Compound indexes
{ status: 1, createdAt: -1 }
{ status: 1, categoryId: 1, subcategoryId: 1, createdAt: -1 }
{ seasonCode: 1, status: 1 }
{ sellerTelegramId: 1 }

// Price comparison indexes
{ status: 1, categoryId: 1, brand: 1, model: 1, storageGb: 1 }
{ status: 1, categoryId: 1, carMake: 1, carModel: 1, carYear: 1 }
```

## Scaling

**Current capacity:** 500-700 concurrent users

**For 2000+ users:**
1. Enable Redis (`REDIS_URL`) - activates BullMQ queues
2. PM2 cluster mode - multi-core utilization
3. Move Sharp to worker - unblock event loop
4. Add rate limiting - protect API

**Queue system (ready but disabled):**
- `ketmar-notifications` - Telegram notifications
- `ketmar-analytics` - Event tracking
- `ketmar-ai-tasks` - AI processing
- `ketmar-lifecycle` - Ad expiration
- `ketmar-search-alerts` - User alerts

## Bot Commands

```
/start      - Welcome & introduction
/categories - Browse categories
/sell       - Create listing
/my_ads     - Your listings
/market     - Browse marketplace
/rental     - Short-term rentals
/myid       - Get Telegram ID
```

## Performance

### Bundle Size (MiniApp)
- Total JS: ~217KB raw (~74KB gzipped)
- Main bundle: 57.91KB (23.02KB gzipped)
- Lazy pages: 3-14KB each

### Load Performance
- Initial load: ~600ms
- Cached reload: <50ms
- Category icons: Instant (lazy + WebP)

### Caching Strategy
- Hashed assets: 1 year immutable
- HTML: no-cache, revalidate
- API: ETag support

## Security

- JWT authentication (30-day expiry)
- Telegram initData HMAC validation
- SMS verification
- Account merging with phone linking
- MongoDB schema validation
- Rate limiting (recommended)
- Fraud detection heuristics

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feature/amazing`)
5. Open Pull Request

## License

MIT License

## Support

- Issues: GitHub Issues
- Telegram: [@KetmarM_bot](https://t.me/KetmarM_bot)

---

**Made with Node.js, React, MongoDB, and Telegram Bot API**

[Try it on Telegram](https://t.me/KetmarM_bot)
