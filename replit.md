# KETMAR Market

## Overview
KETMAR Market is a Telegram-based marketplace designed for buying and selling goods, incorporating seasonal promotions and a hierarchical product categorization system. It features a REST API backend, a Telegram bot, a React-based administration panel, and a React-based Telegram MiniApp. The project aims to deliver a comprehensive e-commerce experience within Telegram, focusing on intuitive navigation, efficient advertisement management, and engaging user interfaces, including 3D icons and real-time chat functionalities. The business goal is to establish a user-friendly and efficient e-commerce platform leveraging the Telegram ecosystem, with aspirations to secure a significant portion of the mobile-first online retail market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Category Icons**: Utilizes 3D WebP icons with lazy loading and async decoding for optimal performance.
- **Admin Panel**: Features a tabbed interface with robust filtering and management tools.
- **MiniApp**: Designed for mobile-first use with a "radius-first" navigation pattern, elderly-friendly sizing, and geo-centric ad discovery. Key components include a `RadiusControl` (0.1-100 km slider), `GroupSelector` (14 top-level categories with large touch targets), and `SubcategoryChips` (horizontal multi-select filtering). Accessibility features include large fonts (24px+ headings, 17-18px body), 48px+ touch targets, and high contrast.

### Technical Implementations
- **Backend**: Node.js with Express.js, providing RESTful APIs and Telegram bot logic, secured with JWT authentication.
- **Data Model**: MongoDB Atlas with Mongoose for User, Category (hierarchical), Ad (geolocation, contact info), and Order entities. Includes support for seasonal promotions and detailed ad contact fields.
- **Geocoding**: Uses Nominatim OSM for reverse geocoding (`/api/geo/resolve`) and provides preset fallback locations.
- **Geo-Search**: `/api/ads/search` supports radius-based search with various sorting options (price, popular, newest, distance).
- **Telegram Bot**: Implemented with Telegraf for user interaction, ad management, and a JWT-authenticated moderation panel.
- **Frontend**: Two React applications built with TypeScript and Vite.
    - **Web Admin Panel**: Manages products, categories, ads, and users, using shadcn/ui, TanStack Query, Wouter, and Tailwind CSS. Supports Telegram Login, one-time links, and SMS for authentication.
    - **Telegram MiniApp**: Mobile-optimized UI with lazy-loaded pages, 3D WebP icons, and elderly-friendly design.
      - **Create Ad Wizard**: A 4-step wizard for ad posting, featuring auto-geolocation, optional photo uploads, basic info entry with large fonts, and auto-extraction of Telegram contacts. Supports deferred publishing with `publishAt` for scheduled ads.
      - **`useNearbyAds` Hook**: Custom hook for debounced, radius-based ad fetching with AbortController for race condition prevention.
      - **`useRoutePrefetch` Hook**: Prefetches routes on `mouseenter` for improved navigation performance.
      - **FarmerFeedPage**: Dedicated farmer marketplace with category filtering, geo-search, and RadiusControl. Displays FarmerProductCard grid with market price comparison.
      - **BulkFarmerUploadPage**: Mass upload page for farmers to add up to 10 products at once with CSV import, auto-category detection, and unit selection.
      - **PriceComparisonBadge**: Component showing market price analysis (below/above/at market) via `/api/analytics/ad/:id/compare`.
- **Image Optimization**: `LazyImage` and `OptimizedImage` components for lazy loading, skeleton shimmers, responsive images, and server-side media proxy for secure access.
- **Performance Optimizations**: Code splitting, data prefetching, route prefetching, Gzip compression, hashed assets, and ETag support.

### System Design Choices
- **Modular Backend**: Separation of concerns for maintainability.
- **Denormalized Order Data**: Ensures historical data integrity.
- **Secure Media Access**: All photo access routed through a server-side proxy, preventing direct GCS access.
- **Radius-First Architecture**: Global radius state for all ad listings, ensuring distance-relevant results.
- **Debounced Fetching**: 300ms debounce on radius changes to optimize API calls, with AbortController cleanup.
- **Single-Select Category Filtering**: Aligns with backend capabilities for consistent filtering.
- **Deferred Publishing**: Allows scheduling ads for future publication with status management and a cron worker for activation. Includes dedicated frontend components for scheduling and display.
- **Price Comparison System**: Provides market analytics with category-specific comparison logic. Extends Ad model with normalized fields for electronics, cars, and realty. `AdPriceSnapshot` caches analytics. `PriceAnalyticsService` calculates market levels. Frontend components (e.g., `PriceBadgeChip`, `PriceMarketBlock`) display pricing insights.
- **Favorites System**: Enables users to favorite ads with notification preferences, managed via API endpoints and a Zustand store.
- **Ad History Tracking**: `AdHistoryEvent` model tracks ad lifecycle events for admin monitoring.
- **Category Auto-Suggestion**: Hybrid approach combining rule-based keywords and statistical learning from user behavior, using `CategoryWordStats` and `CategorySuggestService`. Frontend integrates a dismissible suggestion card.
- **Category Evolution System**: Enables gradual growth of category hierarchy based on real ads. Each root category has an "Other" subcategory (`isOther: true`). Ads placed in "Other" are flagged with `needsCategoryReview: true`. `CategoryEvolutionService` analyzes these ads daily (4 AM), extracts frequent keywords, and creates `CategoryProposal` entries for admin review. Admins can approve (creates new subcategory, moves ads) or reject proposals via `/api/admin/category-proposals/*` endpoints.
- **Farmer Category System**: Specialized system for agricultural products with:
  - Root category "Фермерский рынок" with 11 subcategories (Овощи, Фрукты, Ягоды, Зелень, Картофель, Консервация, Мёд, Молочка, Мясо, Рассада, Корма)
  - 5 seasonal subcategories with auto-activation by date (Valentine's Day, March 8, Easter, Harvest, New Year)
  - `FarmerCategoryService` for keyword-based category suggestion (confidence ≥ 0.5 auto-selects)
  - Unit types: kg, g, piece, liter, pack, jar, bunch, bag with price conversion
  - Ad model extensions: `isFarmerAd`, `unitType`, `quantity`, `pricePerKg`, `deliveryFromFarm`, `canDeliver`, `farmLocation`
  - Quick-post API for simplified ad creation with auto-category detection
  - Nearby farmers endpoint with geo-search by category groups
  - API endpoints: `/api/farmer/categories`, `/suggest-category`, `/detect-quantity`, `/calculate-price`, `/quick-post`, `/nearby`, `/ads`, `/units`
- **Media Upload System**: Manages file size limits, thumbnail generation (via `sharp`), and cleanup. Uses `MediaFile` model to track uploads and a `MediaService` for validation and session management.

## External Dependencies

### Database Services
- **MongoDB Atlas**: Cloud-hosted NoSQL database.

### Third-Party APIs
- **Telegram Bot API**: For all Telegram bot interactions.

### Cloud Services
- **Replit**: Optional deployment platform.
- **Google Cloud Storage**: Used for photo uploads and storage.

### NPM Packages (Key)
- **Backend**: `express`, `mongoose`, `telegraf`, `dotenv`.
- **Frontend**: `react`, `react-dom`, `@tanstack/react-query`, `@radix-ui/*`, `tailwindcss`, `wouter`, `zod`, `react-hook-form`, `vite`, `swiper`, `leaflet`, `react-leaflet`, `date-fns`.