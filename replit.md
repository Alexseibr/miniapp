# KETMAR Market

## Overview

KETMAR Market is a Telegram-based marketplace application for buying and selling goods, featuring seasonal promotions and hierarchical product categories. It comprises a REST API backend (Express.js, MongoDB), a Telegram bot interface (Telegraf), a React-based admin panel for marketplace management, and a React-based Telegram MiniApp for mobile users.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture

The backend uses Node.js with Express.js, orchestrating an API server and Telegram bot. It supports a dual Vite server setup for client and MiniApp frontends. The architecture is modular, separating API, bot logic, database services, and configuration. The API follows a route-based modular pattern with centralized error handling.

### Data Architecture

MongoDB Atlas is used with Mongoose for data modeling. Key entities include User, Category (hierarchical with `parentSlug`), Season, Ad (product listings), and Order. Categories feature a slug-based parent-child relationship for intuitive URLs and support for 3D rendered PNG icons across multiple hierarchy levels, mirroring Kufar.by's taxonomy. Ad documents store photos as URL arrays, `city` field for seller's city display, geolocation (lat/lng + GeoJSON Point) for distance-based search, and Order items are denormalized to preserve historical data.

**Real Estate (Недвижимость) Category Structure:**
- `realty` (Недвижимость)
  - `realty_rent` (Аренда)
    - `realty_rent_daily` (Посуточно) - Short-term/daily rentals
    - `realty_rent_long` (Долгосрочная) - Long-term rentals
  - Legacy categories: `rent_flat`, `rent_house`, `country_base`

**Short-Term Rental Promo Block:**
A permanent Season (`short_term_rental`) is configured as a promotional "island" for daily rentals (`realty_rent_daily`). This block is featured prominently in both the MiniApp and bot, and can be accessed via deep link for dedicated bot instances.

### Telegram Bot Interface

Built with Telegraf, the bot handles user commands like `/start`, `/categories`, `/sell` (including geolocation), `/my_ads`, `/market`, and `/rental`. The `/rental` command provides quick access to short-term (daily) rental listings with deep links to the MiniApp. The bot also features a moderation panel with JWT-authenticated approval/rejection workflows for ads. The bot is the primary mobile interface, complementing the web admin panel.

### Frontend Architecture (Web Admin)

The admin panel is a React 18 application built with TypeScript and Vite. It leverages shadcn/ui (based on Radix UI) for components, TanStack Query for state management, Wouter for routing, and Tailwind CSS for styling. It provides product, category, and dashboard management tools.

### API Design

A RESTful HTTP API with JSON payloads serves both the Telegram bot and web frontends. Key endpoints manage categories, seasons, ads (with filtering), and orders. Moderation endpoints are secured with JWT authentication.

### Configuration Management

Environment variables are used for configuration, supporting dual naming conventions (e.g., `MONGO_URL` or `MONGODB_URI`) for deployment flexibility. `JWT_SECRET` is crucial for securing moderation tokens.

## External Dependencies

### Database Services

- **MongoDB Atlas**: Cloud-hosted NoSQL database, managed via Mongoose.

### Third-Party APIs

- **Telegram Bot API**: Used for all bot interactions, authenticated with `BOT_TOKEN`.

### Cloud Services

- **Replit**: Optional deployment platform.

### NPM Packages (Key Dependencies)

**Backend**: `express`, `mongoose`, `telegraf`, `dotenv`.
**Frontend**: `react`, `react-dom`, `@tanstack/react-query`, `@radix-ui/*`, `tailwindcss`, `wouter`, `zod`, `react-hook-form`, `vite`.

### File Upload

- **@uppy/core** + **@uppy/aws-s3**: Configured for future S3-compatible file storage for product images.

## Recent Changes (November 24, 2025)

### Phone Authentication System
- **Backend**: Implemented SMS-based phone auth with 4-digit codes (5-minute TTL)
  - API Routes: `/api/auth/sms/requestCode`, `/api/auth/sms/login`
  - Model: `SmsLoginCode` with automatic expiration
  - Security: SMS codes logged server-side only, never returned in API responses
  - JWT tokens with 7-day expiration
  - TODO: Integrate real SMS provider (Twilio/SMS.ru) for production

### Chat Messaging System
- **Backend**: Real-time chat with 3-second polling
  - API Routes: `/api/chat/*` (requires JWT auth)
  - Models: `Conversation` (2 participants + ad reference), `Message` (read status tracking)
  - Middleware: `middleware/auth.js` validates Bearer tokens, checks user.isBlocked
  - Endpoints: `/start`, `/my`, `/:id/messages`, `/:id/poll`

- **Frontend (MiniApp)**: 
  - Pages: `ChatPage.tsx` (real-time chat), `ConversationsPage.tsx` (chat list)
  - Components: `AdCard.tsx` (favorites, delivery badges), `AdGallery.tsx` (Swiper carousel), `AdsMap.tsx` (Leaflet maps)
  - Routes: `/chats`, `/chat/:conversationId`
  - Enhanced: AdPage with "Chat with Seller" button
  - Dependencies: swiper, leaflet, react-leaflet@4

### Security Improvements
- Fixed critical vulnerability: Removed SMS code exposure from API responses
- JWT authentication enforced on all chat endpoints
- User blocking support in auth middleware

## MiniApp Performance Optimizations (November 2025)

### Production Build & Code Splitting

- **Build System**: Vite production build with esbuild minification
- **Code Splitting Strategy**:
  - Manual vendor chunks: vendor-react (164KB/53KB gzipped), vendor-ui (3.72KB/1.63KB gzipped)
  - Lazy-loaded pages: 9 pages using React.lazy + Suspense
  - Main bundle: 57.91KB (23.02KB gzipped)
  - Lazy chunks: FeedPage (13.78KB/4.55KB gzipped), SubcategoryPage (3.86KB/1.58KB gzipped), ProfilePage (3.25KB/1.46KB gzipped), etc.
- **Total Bundle Size**: ~217KB raw (~74KB gzipped total)
- **Performance Impact**: 
  - Initial load: ~600ms DOMContentLoaded
  - Lazy chunk load: <200ms first time
  - Total reduction: Main bundle reduced from ~85KB to ~58KB (35% reduction)

### HTTP Caching Strategy

- **Hashed Assets Caching** (/miniapp/assets/*.js, *.css, *.webp):
  - `Cache-Control: public, max-age=31536000, immutable`
  - Long-term caching (1 year) for all hashed assets
  - Safe because Vite includes content hash in filenames
  - ETag enabled for validation
- **HTML Revalidation** (index.html):
  - `Cache-Control: no-cache, max-age=0, must-revalidate`
  - Always revalidates to get latest version after deployments
- **Lazy Chunk Caching**:
  - Lazy-loaded pages (FeedPage, ProfilePage, etc.) cached with immutable headers
  - Browser back/forward navigation uses cache (no re-download)
  - Navigation performance: instant for cached routes
- **Implementation**: Express.js middleware with path-based header logic
- **Environment**: Requires NODE_ENV=production and MINIAPP_PRODUCTION=true
- **Performance Impact**: Cached reload <50ms (14x faster than initial load)

### Category Icon Optimization

- **Format Migration**: Converted all 58 category icons from PNG to WebP format
- **Compression Ratio**: 45x size reduction (43MB → 1.2MB total, 97% smaller)
- **Quality**: WebP q=80 compression maintains high visual quality
- **Icon Distribution**:
  - Level 1 (Main): 14 icons at ~15-30KB each (vs ~800KB PNG)
  - Level 2 (Subcategories): 30 icons at ~12-20KB each (vs ~700KB PNG)
  - Level 3: 11 icons at ~15-30KB each
  - Level 4: 3 icons at ~28-52KB each
- **Loading Optimizations**:
  - Lazy loading: `loading="lazy"` attribute on all category icons
  - Async decoding: `decoding="async"` for non-blocking image rendering
  - Browser caching for instant subsequent page loads
- **Impact**: Initial page load <2 seconds, icon rendering near-instant with lazy loading

### Overall Performance Results

- **Initial Page Load**: ~600ms DOMContentLoaded (production build)
- **Cached Reload**: <50ms DOMContentLoaded (HTTP caching)
- **Total JavaScript**: ~217KB raw (~74KB gzipped)
- **Total Images**: ~1.2MB WebP (all 58 category icons)
- **Navigation**: Instant for cached routes, <200ms for first-time lazy loads
- **Telegram WebView Compatibility**: Full HTTP caching support, no service worker needed