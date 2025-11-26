# KETMAR Market

## Overview
KETMAR Market is a Telegram-based marketplace designed for buying and selling goods, featuring seasonal promotions and a hierarchical product categorization system. It comprises a REST API backend, a Telegram bot, a React administration panel, and a React-based Telegram MiniApp. The project aims to provide a comprehensive e-commerce experience within Telegram, focusing on intuitive navigation, efficient advertisement management, and engaging user interfaces, including 3D icons and real-time chat functionalities. The business goal is to establish a user-friendly and efficient e-commerce platform leveraging the Telegram ecosystem, targeting a significant portion of the mobile-first online retail market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Category Icons**: Utilizes 3D WebP icons with lazy loading and async decoding.
- **Admin Panel**: Features a tabbed interface with robust filtering and management tools.
- **MiniApp**: Designed for mobile-first use with a "radius-first" navigation pattern, elderly-friendly sizing, and geo-centric ad discovery. Accessibility features include large fonts, 48px+ touch targets, and high contrast.

### Technical Implementations
- **Backend**: Node.js with Express.js, providing RESTful APIs and Telegram bot logic, secured with JWT authentication.
- **Data Model**: MongoDB Atlas with Mongoose for User, Category (hierarchical), Ad (geolocation, contact info), and Order entities. Supports seasonal promotions and detailed ad contact fields.
- **Geocoding**: Uses Nominatim OSM for reverse geocoding and provides preset fallback locations.
- **Geo-Search**: Supports radius-based search with various sorting options.
- **Telegram Bot**: Implemented with Telegraf for user interaction, ad management, and a JWT-authenticated moderation panel.
- **Frontend**: Two React applications built with TypeScript and Vite.
    - **Web Admin Panel**: Manages products, categories, ads, and users, using shadcn/ui, TanStack Query, Wouter, and Tailwind CSS. Supports Telegram Login, one-time links, and SMS for authentication.
    - **Telegram MiniApp**: Mobile-optimized UI with lazy-loaded pages and 3D WebP icons. Features include a 4-step ad creation wizard with auto-geolocation and scheduled publishing, custom hooks for debounced ad fetching and route prefetching, and specialized pages like FarmerFeedPage and BulkFarmerUploadPage.
- **Image Optimization**: Components for lazy loading, skeleton shimmers, responsive images, and server-side media proxy.
- **Performance Optimizations**: Code splitting, data prefetching, route prefetching, Gzip compression, hashed assets, and ETag support.

### System Design Choices
- **Modular Backend**: Emphasizes separation of concerns.
- **Denormalized Order Data**: Ensures historical data integrity.
- **Secure Media Access**: All photo access is routed through a server-side proxy.
- **Radius-First Architecture**: Global radius state for all ad listings.
- **Debounced Fetching**: 200ms debounce on radius changes with AbortController for API call optimization.
- **Fast Market Scoring System**: Smart ad ranking combining distance (40%), freshness (30%), and engagement (30%) with category boosts for farmer market (+10%) and personal items (+5%). Uses log-scaled engagement normalization and AdStats tracking.
- **Farmer Tips Service**: AI-powered demand recommendations for farmers using bulk aggregation of search patterns, spike detection, and regional supply analysis. Optimized with O(1) bulk queries.
- **Single-Select Category Filtering**: Consistent with backend capabilities.
- **Deferred Publishing**: Allows scheduling ads for future publication with status management and a cron worker.
- **Price Comparison System**: Provides market analytics with category-specific comparison logic, including caching and dedicated services.
- **Favorites System**: Enables users to favorite ads with notification preferences.
- **Ad History Tracking**: Tracks ad lifecycle events for admin monitoring.
- **Category Auto-Suggestion**: Hybrid approach combining rule-based keywords and statistical learning.
- **Category Evolution System**: Allows gradual growth of the category hierarchy based on real ad data and admin review of proposals.
- **Dynamic Category Visibility**: Categories can show/hide based on ad count thresholds and geo-location.
- **Smart Search System**: Provides intelligent search with fuzzy matching, category suggestions, and nearby ad results.
- **Local Trends Analytics**: Tracks demand/supply spikes and provides local trend data.
- **Hot Search System**: Aggregates popular searches by geo-location.
- **Scope Toggle**: Allows switching between "local" and "country" scope for ad listings.
- **Farmer Category System**: Specialized system for agricultural products with predefined and seasonal subcategories, unit types with price conversion, and quick-post functionalities.
- **Farmer Cabinet Dashboard**: A comprehensive 6-tab seller dashboard providing product management, quick upload, analytics, local demand tracking, subscription management, and seasonal fair information.
- **Farmer Monetization System**: Three-tier subscription model (FREE/PRO/MAX) for farmers, including premium card features and boosting options.
- **Seasonal Fairs System**: Integration for predefined seasonal events with associated product categories and real-time event status.
- **Media Upload System**: Manages file size limits, thumbnail generation, and cleanup.
- **Ad Lifecycle System**: Manages ad expiration, extension, daily republishing, and seller reminders based on category-specific TTL rules.
- **Search Alerts System**: Notifies buyers when searched items become available after zero-result searches.
- **Demand Notification System**: Notifies sellers when demand spikes for their product categories.
- **AI Layer**: Unified AI services for text generation (titles, descriptions, tags), personalized recommendations (similar ads, personal feed, trending nearby), and content moderation (risk scoring, spam detection). It tracks user activity for ML learning.
- **Geo-Intelligence Map System**: Real-time geo-analytics with demand/supply heatmaps, trending local searches, clustered ad markers, and smart geo-recommendations for buyers/sellers. Includes GeoEvent model for tracking user geo-activity (searches, views, favorites), GeoEngine service with caching, and interactive Leaflet map components with heatmap layers and radius controls.
- **Multi-Platform Authentication System**: Unified authentication across Telegram MiniApp, Web, and Mobile WebView with:
  - Platform Adapters (Telegram, Web, MobileApp) for abstracted platform-specific functionality
  - JWT-based authentication with secure token management
  - SMS verification for phone number linking
  - Account merging logic based on verified phone numbers (same phone = same user across platforms)
  - AuthProviders array tracking linked auth methods per user
  - PlatformProvider React context for platform abstraction in MiniApp
- **Seller Stores System**: Dedicated storefronts for sellers with:
  - SellerProfile model for store customization (name, slug, avatar, banner, description, contact info)
  - SellerSubscription model for tracking store subscribers with notification preferences
  - SellerReview model for buyer feedback with rating system (1-5 stars) and seller replies
  - SellerStoreNotificationService for push notifications to subscribers on new products
  - Public storefront page (SellerStorePage) with products listing, reviews, and contact info
  - Seller dashboard (SellerDashboardPage) with analytics, subscriber stats, and AI tips
  - API endpoints: /api/seller-profile, /api/seller-subscriptions, /api/seller-reviews
  - Deep link support: store_<slug> for direct access via Telegram
- **MEGA-ANALYTICS 10.0**: Professional marketplace-level seller analytics (Avito Pro, Yandex Market style) with:
  - AnalyticsEvent model for tracking all seller-related events (views, contacts, favorites, messages, etc.)
  - SellerAnalyticsEngine service with caching, aggregations, and AI-powered suggestions
  - Overview dashboard: views timeline, contacts, favorites, subscribers, top products
  - Price position analysis: comparison with market prices, overpriced/underpriced detection
  - Category performance: conversion rates, price positioning, recommendations per category
  - Geo-analytics: demand hotspots, buyer location heatmaps
  - AI suggestions: prioritized tips for improving sales, inventory, pricing
  - Warnings system: alerts for photos, declining views, etc.
  - API endpoints: /api/seller-analytics/overview, /views, /contacts, /price-position, /category-performance, /hotspots, /suggestions, /warnings, /track
  - MiniApp page: SellerAnalyticsPage with 5-tab interface (Overview, Prices, Categories, Geo, Tips)
- **MEGA-PROMPT 14.0 Digital Twin**: AI-powered personalized shopping assistant with:
  - UserTwin model for tracking buyer interests, watchlist, preferences, and recommendations
  - DigitalTwinService for AI chat, context-aware recommendations, and personalized summaries
  - DigitalTwinNotificationService for push notifications on new matches and price drops
  - Watchlist management with price monitoring, radius filtering, and notification preferences
  - AI chat interface with context-aware responses, nearby ad suggestions, and reminder creation
  - Interest learning from search/view/favorite activity patterns
  - Integration with SmartSearchService, GeoEngine, and RecommendationService
  - API endpoints: /api/twin/me, /api/twin/chat, /api/twin/watch-items, /api/twin/preferences, /api/twin/activity
  - MiniApp pages: TwinPage (assistant dashboard), TwinChatPage (AI chat interface)
  - Deep link support: twin for direct access via Telegram
- **MEGA-PROMPT 13.0 AI Dynamic Pricing**: Uber-style surge pricing optimization for sellers with:
  - DynamicPriceEngine service analyzing 5 key factors:
    - Demand (local search/view activity, regional interest)
    - Competition (competitor prices, market position)
    - Seasonality (seasonal trends, product relevance)
    - Timing (day of week, time of day patterns)
    - Buyer Activity (conversion rates, engagement levels)
  - Price recommendations: raise/lower/keep with confidence scores
  - Market position detection: below_market, fair_price, above_market
  - Potential buyer estimation based on geo-analytics
  - PriceWatcher worker with scheduled tasks:
    - Market monitoring every 10 minutes
    - Daily seller alerts at 9:00, 14:00, 19:00
  - Integration with PriceAnalyticsService, HotspotEngine, SeasonalInsightService
  - API endpoints: /api/dynamic-price/analyze/:adId, /api/dynamic-price/apply/:adId, /api/dynamic-price/my-ads
  - MiniApp page: DynamicPricingPage with factor visualization and one-click price apply
  - Seller Dashboard integration with AI Pricing card
  - Deep link support: pricing_<adId> for direct access via Telegram
- **MEGA-PROMPT 15.0 Seller's Digital Twin**: AI-powered business assistant for sellers with:
  - SellerTwin model for tracking inventory, issues, recommendations, predictions, and performance metrics
  - SellerTwinEngine service providing:
    - Listing quality analysis (photos, description, title, category, price scoring)
    - Demand prediction with per-ad forecasts and chance of sale estimation
    - Competitive analysis with market position tracking
    - Product suggestions based on seasonal insights and missed opportunities
    - Optimal publish timing recommendations
    - Market change monitoring with price alerts
  - Integration with DynamicPriceEngine, HotspotEngine, and SeasonalInsightService
  - API endpoints: /api/seller-twin/overview, /recommendations, /issues, /predictions, /opportunities, /seasonal, /settings, /market-alerts
  - MiniApp page: SellerTwinPage with multi-tab dashboard (Overview, Recommendations, Issues, Predictions, Settings)
  - Deep link support: seller-twin for direct access via Telegram
- **MEGA-PROMPT 17.0 AI Recommendations**: TikTok-style personalized product feed with:
  - RecommendationEngine service using multi-factor scoring:
    - Similarity scoring (category match, keyword overlap, price range)
    - Geo-proximity scoring (distance-based weighting)
    - Trending score (recency, view counts, seasonal relevance)
    - Quality score (photos, description length, title quality)
    - Seller affinity (subscribed seller preference)
  - User context extraction from UserTwin and AnalyticsEvent data
  - Candidate retrieval from nearby, category-matched, seasonal, and recent ads
  - AI-generated insights for feed personalization
  - API endpoints: /api/recommendations/feed, /similar/:adId, /trending-nearby, /trending, /track
  - MiniApp page: ForYouFeedPage with TikTok-like vertical swipe interface and grid view toggle
  - Deep link support: for-you-feed for direct access via Telegram

## External Dependencies

### Database Services
- **MongoDB Atlas**: Cloud-hosted NoSQL database.

### Third-Party APIs
- **Telegram Bot API**: For all Telegram bot interactions.
- **Nominatim OSM**: For geocoding services.

### Cloud Services
- **Google Cloud Storage**: Used for photo uploads and storage.