# KETMAR Market

## Overview
KETMAR Market is a Telegram-based marketplace for buying and selling goods, featuring seasonal promotions and hierarchical product categories. It integrates a REST API backend, a Telegram bot, a React-based admin panel, and a React-based Telegram MiniApp. The project aims to provide a comprehensive e-commerce platform within Telegram, focusing on intuitive navigation, efficient ad management, and engaging user experiences with features like 3D icons and real-time chat. The business vision is to create a user-friendly and efficient e-commerce solution leveraging the Telegram ecosystem, with ambitions to capture a significant market share in mobile-first online retail.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Category Icons**: Utilizes 3D WebP icons for all categories, with lazy loading and async decoding for performance.
- **Admin Panel**: Features a tabbed design with robust filtering and management tools.
- **MiniApp**: Designed for mobile with **radius-first navigation** pattern, elderly-friendly sizing, and geo-centric ad discovery.
  - **Radius-First Navigation**: HomePage shows GroupSelector → SubcategoryChips → RadiusControl → Nearby Ads. FeedPage shows RadiusControl → optional single-select category filter → all nearby ads.
  - **RadiusControl Component**: 0.1-100 km slider with presets [0.3, 0.5, 1, 3, 5, 10] km, integrated with useGeoStore, 300ms debounce on changes.
  - **GroupSelector Component**: 14 top-level categories in 2-column grid with 3D WebP icons, single-select interaction, large 48px+ touch targets.
  - **SubcategoryChips Component**: Horizontal scrollable multi-select chips for subcategory filtering within selected group.
  - **Elderly-Friendly UX**: 24px+ headings, 17-18px body text, 48px+ touch targets, high contrast (#3B73FC brand blue), large buttons with generous padding.
  - **Advanced Features**: Integrates `Swiper` for image carousels, `Leaflet` for maps, `date-fns` for relative timestamps. Bottom navigation conditionally displayed within Telegram MiniApp environment only.

### Technical Implementations
- **Backend**: Node.js with Express.js, providing a RESTful API and Telegram bot logic. It uses JWT authentication for secure endpoints.
- **Data Model**: MongoDB Atlas with Mongoose manages data for User, Category (hierarchical with 3D icon support), Ad (listings with geolocation and contact info), and Order entities. A permanent `short_term_rental` Season is configured for promotions. Ad model includes geoLabel (human-readable location like "Брест (Гершоны)"), contactType, contactPhone, contactUsername, contactInstagram fields for seller contact management.
- **Geocoding API**: `/api/geo/resolve` endpoint uses Nominatim OSM for reverse geocoding (lat/lng → human-readable location). `/api/geo/preset-locations` provides fallback city list (Минск, Брест, Гомель, Витебск, Гродно, Могилёв).
- **Geo-Search API**: `/api/ads/search` endpoint supports radius-based search using `buyerLat`/`buyerLng` and `maxDistanceKm` parameters. Returns `distanceKm` field (kilometers with 2 decimals) for each result. Fully supports sorting modes: `price_asc`/`price_desc`, `popular` (by views), `newest`/`oldest` (by date), and `distance` (default when geo-coordinates provided).
- **Telegram Bot**: Built with Telegraf, handling user interactions, ad management, and a JWT-authenticated moderation panel.
- **Frontend**: Two React applications built with TypeScript and Vite.
    - **Web Admin Panel**: For managing products, categories, ads, and users. Uses shadcn/ui (Radix UI), TanStack Query, Wouter, and Tailwind CSS. Authentication includes Telegram Login Widget, one-time links, and SMS codes.
    - **Telegram MiniApp**: Mobile user interface with radius-first navigation, lazy-loaded pages, optimized 3D WebP category icons, and elderly-friendly UX.
      - **Create Ad Wizard**: 4-step elderly-friendly wizard for posting ads: (1) Auto-detect geolocation via navigator.geolocation + Nominatim OSM or fallback to preset cities, (2) Upload 0-4 photos (optional) with ActionSheet camera/gallery selection and retry on failure, (3) Enter basic info (title, category, price, description) with large fonts, (4) Auto-extract Telegram contacts (phone/username) from initData or allow Instagram, plus deferred publishing (publishAt) option for scheduling ads. NO manual address/phone entry. Uses useReducer for state management with progress bar and step validation. Supports scheduled ads with status='scheduled' and validUntil calculated from publishAt date.
      - **useNearbyAds Hook**: Custom hook for radius-based ad fetching with 300ms debounce, AbortController (local capture to prevent race conditions), automatic stale data clearing on location loss, and distance-sorted results. Returns isEmpty/hasVeryFew for smart empty states.
      - **useRoutePrefetch Hook**: Route prefetching on mouseenter using composedPath() for safe event delegation (handles Text nodes and non-anchor elements).
- **Image Optimization**: Implements `LazyImage` and `OptimizedImage` components with IntersectionObserver for lazy loading, skeleton shimmers, SVG fallbacks, and priority loading. It includes infrastructure for responsive images (`srcset/sizes`) and leverages server-side media proxy for secure access and caching.
- **Performance Optimizations**: Features code splitting with React.lazy and Suspense, data prefetching (categories, first-page ads), route prefetching on `mouseenter` (composedPath()-based), Gzip compression, hashed assets with long `Cache-Control` headers, and ETag support. Core Web Vitals are tracked for monitoring.

### System Design Choices
- Modular backend design separating concerns.
- Denormalized Order data for historical integrity.
- Direct GCS public access is prevented; all photo access flows through a server-side proxy for authentication and caching.
- **Radius-First Architecture**: Global radius state in useGeoStore (Zustand), clamped to 0.1-100 km. All ad listings require geolocation first, ensuring distance-relevant results.
- **Debounced Fetching**: 300ms debounce on radius changes to reduce API load, with AbortController cleanup to prevent stale data leaks.
- **Single-Select Category Filtering**: FeedPage uses single-select (not multi-select) to align with backend API capabilities, preventing client-side filtering confusion.
- **Local AbortController Capture**: useNearbyAds captures AbortController locally at fetch start to prevent race conditions when rapid radius/location changes abort in-flight requests.
- **Deferred Publishing**: Ads can be scheduled for future publication via `publishAt` field. Scheduled ads have `status='scheduled'` and `moderationStatus='scheduled'`. Cron worker (`workers/publishScheduler.js`) runs every minute, activating ads where `publishAt <= now`. On activation, status becomes 'active', moderationStatus stays unchanged (unless it was 'scheduled'), and validUntil is calculated from publishAt date (not creation date). Scheduled ads are hidden from public search but visible to owners in "My ads".
- **Price Comparison System**: Comprehensive market analytics with category-specific comparison logic:
  - **Ad Model Extensions**: Normalized fields for electronics (brand, model, storageGb, ramGb), cars (carMake, carModel, carYear, carEngineVolume, carTransmission), realty (realtyType, realtyRooms, realtyAreaTotal, realtyCity, realtyDistrict, pricePerSqm with auto-calculation).
  - **AdPriceSnapshot Model**: Caches pricing analytics per ad with 6-hour TTL index for automatic cleanup.
  - **PriceAnalyticsService**: Dynamic time windows (7/30/90 days), category-specific aggregation pipelines (min, max, avg, median, count), market level calculation (below_market <-5%, at_market ±5%, above_market >10%).
  - **Category Slug Mappings**: Electronics (telefony-planshety, noutbuki-kompyutery, tv-foto-video, audio-tehnika, igry-igrovye-pristavki, tovary-dlya-kompyutera), Cars (legkovye-avtomobili, gruzovye-avtomobili, mototehnika, spetstekhnika), Realty (kvartiry, komnaty, doma-dachi-kottedzhi, uchastki, garazhi-mashinomesta, kommercheskaya-nedvizhimost).
  - **API Endpoints**: `/api/pricing/ad/:adId/market` (seller analytics), `/api/pricing/brief/:adId` (buyer badge), `/api/pricing/brief/batch` (batch), `/api/pricing/estimate` (new ad estimation).
  - **Frontend Components**: PriceHint (seller price recommendations with 500ms debounce, category reset), PriceBadge (buyer market badges with green/yellow colors).
  - **Cache Invalidation**: Ad post-save hook deletes AdPriceSnapshot when price changes.

## External Dependencies

### Database Services
- **MongoDB Atlas**: Cloud-hosted NoSQL database.

### Third-Party APIs
- **Telegram Bot API**: For all bot interactions.

### Cloud Services
- **Replit**: Optional deployment platform.
- **Google Cloud Storage**: Used for photo uploads, with a server-side media proxy for secure access and caching.

### NPM Packages (Key)
- **Backend**: `express`, `mongoose`, `telegraf`, `dotenv`.
- **Frontend**: `react`, `react-dom`, `@tanstack/react-query`, `@radix-ui/*`, `tailwindcss`, `wouter`, `zod`, `react-hook-form`, `vite`, `swiper`, `leaflet`, `react-leaflet`, `date-fns`.