# KETMAR Market

## Overview
KETMAR Market is a Telegram-based marketplace designed for buying and selling goods, featuring seasonal promotions and a robust product categorization system. The project includes a REST API backend, a Telegram bot, a React administration panel, and a React-based Telegram MiniApp. Its core purpose is to deliver a comprehensive and intuitive e-commerce experience within the Telegram ecosystem, emphasizing efficient advertisement management, engaging user interfaces with 3D icons, and real-time chat functionalities. The business aims to establish a user-friendly platform, leveraging Telegram's reach to capture a significant share of the mobile-first online retail market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The MiniApp features a fixed layout with a scrollable content area, sticky header, and fixed bottom tabs with safe area padding. Ad cards display price, title, and location with distance. Category icons use 3D WebP images with lazy loading. The Admin Panel employs a tabbed interface. The MiniApp is mobile-first, utilizing "radius-first" navigation, elderly-friendly sizing, and accessibility features. A custom Neon UI Kit provides a Matrix/Cyberpunk aesthetic for analytics visualizations. Specific components like `ScreenLayout` ensure proper scroll behavior and `Keyboard-Aware BottomTabs` prevent UI jumps when the keyboard appears. A 5-step Ad Creation Wizard guides users through listing items, including photo upload, AI-powered description suggestions, and geolocation.

### Technical Implementations
The backend is built with Node.js and Express.js, providing RESTful APIs and Telegram bot logic, secured by JWT authentication. Data is stored in MongoDB Atlas using Mongoose. Geocoding is handled by Nominatim OSM, supporting geo-search, radius-based queries, and server-side reverse geocoding to resolve coordinates to city/district names. The Telegram bot uses Telegraf. Both the Admin Panel and Telegram MiniApp are React applications using TypeScript and Vite, supporting Telegram Login, one-time links, and SMS for authentication. The MiniApp is also accessible via web browsers with responsive design. Image optimization includes lazy loading, skeleton shimmers, responsive images, and a server-side media proxy with WebP conversion. Performance is enhanced through code splitting, data prefetching, Gzip compression, and ETag support. A dedicated REST API (`/api/mobile/v1`) serves native mobile applications. A Mobile Push Notifications System uses FCM/APNs and Telegram as a fallback, with geo-targeting for new ads.

### System Design Choices
The system features a modular backend with separation of concerns. Order data is denormalized, and all photo access is routed through a secure server-side proxy. A "radius-first" architecture governs ad listings with debounced fetching. Key features include a Fast Market Scoring System, an AI-powered Farmer Tips Service, deferred ad publishing, a Price Comparison System, Favorites System with notifications, and Ad History Tracking. Category management includes Auto-Suggestion, an Evolution System, and Dynamic Visibility. A Smart Search System offers fuzzy matching and category suggestions. Local Trends Analytics and a Hot Search System track demand. A Scope Toggle allows switching between "local" and "country" ad listings. Specialized Farmer Category System and Farmer Cabinet Dashboard cater to agricultural products, including a three-tier Farmer Monetization System and a Seasonal Fairs System. The Media Upload System manages file size, thumbnails, and cleanup. The Ad Lifecycle System handles expiration and republishing. Search Alerts and Demand Notification systems provide user and seller notifications. An AI Layer provides unified services for text generation, personalized recommendations, and content moderation. A Geo-Intelligence Map System offers real-time geo-analytics with heatmaps and clustered markers. A Multi-Platform Authentication System provides unified JWT-based authentication. A Seller Stores System enables dedicated storefronts with analytics (Store PRO Analytics) and includes a Campaign Analytics System. A Unified Shop Cabinet provides a role-aware seller management interface for different seller types (SHOP, FARMER, BLOGGER, ARTISAN). Advanced AI features include MEGA-ANALYTICS 10.0, MEGA-PROMPT 14.0 Digital Twin, MEGA-PROMPT 13.0 AI Dynamic Pricing, MEGA-PROMPT 15.0 Seller's Digital Twin, and MEGA-PROMPT 17.0 AI Recommendations. A comprehensive Rating & Anti-Fraud System tracks `ContactEvent` and `AdFeedback`. An Admin Panel System allows managing sellers, farmers, moderation, analytics, and shop requests. A **Free Giveaway System** ("Даром отдаю") provides a dedicated section for free items with pink-themed UI (#EC4899), simplified 4-step posting flow (1 photo limit), and giveaway-specific subcategories (Одежда, Детские вещи, Мебель, Техника, Прочее). Giveaway ads have `isFreeGiveaway: true` flag and are excluded from normal feeds, showing only in `/category/darom` route.

## External Dependencies

### Database Services
- **MongoDB Atlas**: Cloud-hosted NoSQL database.

### Third-Party APIs
- **Telegram Bot API**: For Telegram bot interactions.
- **Nominatim OSM**: For geocoding services.
- **Firebase Cloud Messaging (FCM)**: For Android push notifications.
- **Apple Push Notification service (APNs)**: For iOS push notifications.

### Cloud Services
- **Google Cloud Storage**: For photo uploads and storage.

## Multicurrency & Internationalization (i18n)

### Region Configuration
The system supports multiple countries with their currencies: BY (BYN), RU (RUB), UA (UAH), KZ (KZT), PL (PLN), DE (EUR), US (USD). Configuration is stored in `config/regionConfig.js` with country presets, currency info, and locale mappings.

### Translation System
- **Backend**: `services/i18nService.js` provides translation lookup with fallback chain (user language → English)
- **MiniApp**: `miniapp/src/lib/i18n.ts` and `useTranslation` hook for component-level translations
- **Locales**: JSON files in `locales/{ru,en,pl}/` with namespaces (common.json, categories.json)

### Price Formatting
- **Backend**: `utils/formatPrice.js` uses Intl.NumberFormat for locale-aware currency formatting
- **MiniApp**: `useRegionStore` (Zustand) manages region/currency state with `formatPrice` method
- **Hook**: `useFormatPrice` provides `format`, `formatCompact`, and `formatCard` helpers

### Region Detection Priority
1. User profile preference (if logged in)
2. Telegram language_code from WebApp initData
3. Browser Accept-Language header
4. Default to BY/ru

### Components
- `RegionSelector`: Bottom sheet with country, currency, and language tabs
- Integrated into AdCard, AdCardSmall for price display

## Delivery & Orders System

### Order Flow
1. **Buyer creates order**: From AdPage, buyer clicks "Order" button, selects quantity, delivery option, and address
2. **Order stored**: Created via `/api/shop/orders` with adId, quantity, deliveryRequired flag, and deliveryLocation
3. **Seller views orders**: In ShopCabinetPage "Orders" tab, sees new/confirmed/delivering orders
4. **Route planning**: Seller clicks "Plan route" to get optimal delivery sequence using nearest-neighbor algorithm

### Backend Routes
- `POST /api/shop/orders` - Create order (buyer)
- `GET /api/shop/orders` - List seller's orders with date filter (today/tomorrow/future)
- `GET /api/shop/orders/route-plan` - Get optimized delivery route
- `GET /api/farmer/orders/route-plan` - Farmer-specific route planning

### Frontend Components
- **AdPage.tsx**: Order modal with quantity selector, delivery toggle, address input
- **ShopCabinetPage.tsx**: Orders tab with summary cards, route visualization, order list with status filters
- **OrdersPage.tsx**: Buyer's order history

### Order Statuses
- `new` - Just created, awaiting seller confirmation
- `confirmed` - Seller confirmed, preparing for delivery
- `delivering` - In transit
- `completed` - Successfully delivered
- `cancelled` - Order cancelled

### Route Planning Algorithm
Uses nearest-neighbor algorithm starting from seller's base location. Orders with `deliveryRequired: true` are included in route planning. Returns total distance, estimated time, and ordered sequence with per-stop distances.
