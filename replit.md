# KETMAR Market

## Overview
KETMAR Market is a Telegram-based marketplace for buying and selling goods, featuring seasonal promotions and a hierarchical product categorization system. It includes a REST API backend, a Telegram bot, a React administration panel, and a React-based Telegram MiniApp. The project aims to provide a comprehensive and intuitive e-commerce experience within Telegram, focusing on efficient advertisement management, engaging user interfaces with 3D icons, and real-time chat. The business vision is to establish a user-friendly e-commerce platform leveraging the Telegram ecosystem to capture a significant share of the mobile-first online retail market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The MiniApp features a fixed layout with a scrollable content area, sticky header, and fixed bottom tabs with safe area padding. Ad cards display price, title, and location with distance. Category icons utilize 3D WebP images with lazy loading. The Admin Panel uses a tabbed interface for robust management. The MiniApp is mobile-first, with "radius-first" navigation, elderly-friendly sizing, and accessibility features like large fonts and high contrast.

### Multi-Platform Web Adaptation (NEW)
The MiniApp now supports full web browser access with responsive layout adaptation:
- **Platform Detection**: `detectPlatform()` in `miniapp/src/platform/platformDetection.ts` identifies telegram/mobile_app/web platforms
- **AppLayout**: Responsive layout (`miniapp/src/components/layout/AppLayout.tsx`) switches between:
  - Mobile: BottomTabs navigation (for Telegram MiniApp and mobile web)
  - Desktop: DesktopSidebar navigation (for web browsers on screens >= 768px)
- **DesktopSidebar**: Full sidebar navigation (`miniapp/src/components/layout/DesktopSidebar.tsx`) with logo, navigation sections, user avatar, and logout
- **SMS Authentication**: Web users authenticate via phone number + SMS code:
  - Endpoints: `/api/auth/sms/requestCode` and `/api/auth/sms/login`
  - Store: `useUserStore.requestSmsCode()` and `useUserStore.verifySmsCode()`
  - Token storage: `localStorage.setItem('ketmar_auth_token', token)`
- **AuthScreen**: Full authentication screen (`miniapp/src/components/AuthScreen.tsx`) with phone input, code verification, and Telegram login option
- **PrivateRoute**: Route protection (`miniapp/src/components/PrivateRoute.tsx`) redirects unauthenticated web users to `/auth`
- **JWT Compatibility**: `api/routes/phoneAuth.js` uses SESSION_SECRET for JWT signing, compatible with AuthService

### Technical Implementations
The backend is built with Node.js and Express.js, providing RESTful APIs and Telegram bot logic, secured by JWT authentication. Data is stored in MongoDB Atlas using Mongoose, with models for Users, hierarchical Categories, Ads (including geolocation and contact info), and Orders, supporting seasonal promotions. Geocoding is handled by Nominatim OSM with preset fallbacks. Geo-search supports radius-based queries. The Telegram bot uses Telegraf for user interaction and an authenticated moderation panel.

The frontend consists of two React applications using TypeScript and Vite:
- **Web Admin Panel**: Manages products, categories, ads, and users, utilizing shadcn/ui, TanStack Query, Wouter, and Tailwind CSS. Supports Telegram Login, one-time links, and SMS for authentication.
- **Telegram MiniApp**: Mobile-optimized UI with lazy-loaded pages and 3D WebP icons, featuring a 4-step ad creation wizard with auto-geolocation and scheduled publishing, custom hooks for debounced fetching, and specialized pages.

Image optimization includes lazy loading, skeleton shimmers, responsive images, and a server-side media proxy with WebP format conversion (95% size reduction for feed images). The Ad model stores a pre-generated `previewUrl` for optimized feed display. The `/api/media/proxy` endpoint supports `?w=WIDTH&q=QUALITY&f=webp` parameters for on-the-fly image optimization using Sharp. Performance optimizations leverage code splitting, data prefetching, Gzip compression, and ETag support.

### System Design Choices
The system features a modular backend with separation of concerns. Order data is denormalized for historical integrity, and all photo access is routed through a secure server-side proxy. A "radius-first" architecture governs ad listings, with debounced fetching for API calls.

A Fast Market Scoring System ranks ads by distance, freshness, and engagement, with category boosts. An AI-powered Farmer Tips Service provides demand recommendations. Ads support deferred publishing with a cron worker. A Price Comparison System offers market analytics. Users can favorite ads with notifications via a Favorites System, and Ad History Tracking monitors ad lifecycles.

Category management includes Auto-Suggestion, an Evolution System for gradual hierarchy growth, and Dynamic Visibility based on ad counts and geo-location. A Smart Search System offers fuzzy matching and category suggestions. Local Trends Analytics tracks demand/supply spikes, and a Hot Search System aggregates popular geo-located searches. A Scope Toggle allows switching between "local" and "country" ad listings.

A specialized Farmer Category System supports agricultural products with unit types and quick-post features. A Farmer Cabinet Dashboard provides a comprehensive seller interface with product management, analytics, and local demand tracking. A Farmer Monetization System offers a three-tier subscription model. A Seasonal Fairs System integrates predefined events.

The Media Upload System manages file size, thumbnails, and cleanup. The Ad Lifecycle System handles expiration, extension, and republishing based on category-specific rules. Search Alerts and Demand Notification systems provide user and seller notifications, respectively.

An AI Layer provides unified services for text generation, personalized recommendations (feed, similar ads, trending nearby), and content moderation, learning from user activity. A Geo-Intelligence Map System offers real-time geo-analytics with heatmaps, clustered ad markers, and smart geo-recommendations, tracking user geo-activity and using interactive Leaflet maps.

A Multi-Platform Authentication System provides unified JWT-based authentication across MiniApp, Web, and Mobile WebView, with platform adapters, SMS verification, and account merging logic.

A Seller Stores System enables dedicated storefronts with customizable profiles, subscriptions, reviews, notifications, and deep link support. Store PRO Analytics offers an advanced dashboard for store owners with daily stats, KPI cards, time-series charts, conversion funnels, top product rankings, geographic analysis, campaign tracking, audience segmentation, and CSV export.

A Campaign Analytics System tracks marketing campaigns (seasonal fairs, special events) with public campaign storefronts, campaign-specific analytics for stores, and integration with Store PRO Analytics. Campaigns are managed through the Season model with code, name, type (store/farmer/both), dates, and isActive status. API endpoints include /api/campaign-analytics/campaigns (public listing), /ads (campaign ads), /overview, /daily, /geo, and /prices (authenticated analytics). MiniApp pages CampaignsListPage and CampaignPage provide user-facing campaign browsing.

MEGA-ANALYTICS 10.0 provides professional marketplace-level seller analytics with event tracking, an analytics engine, overview dashboards, price position analysis, category performance insights, geo-analytics, AI suggestions, and warnings.

MEGA-PROMPT 14.0 Digital Twin is an AI-powered personalized shopping assistant with a UserTwin model tracking interests, a service for AI chat, context-aware recommendations, notifications, watchlist management, and interest learning.

MEGA-PROMPT 13.0 AI Dynamic Pricing offers Uber-style surge pricing optimization for sellers, analyzing demand, competition, seasonality, timing, and buyer activity to provide price recommendations, market position detection, and potential buyer estimations. It includes a PriceWatcher worker for market monitoring and seller alerts.

MEGA-PROMPT 15.0 Seller's Digital Twin is an AI-powered business assistant for sellers, tracking inventory, providing listing quality analysis, demand prediction, competitive analysis, product suggestions, optimal publishing times, and market change monitoring.

MEGA-PROMPT 17.0 AI Recommendations provides a TikTok-style personalized product feed using a RecommendationEngine with multi-factor scoring (similarity, geo-proximity, trending, quality, seller affinity), user context extraction, candidate retrieval, and AI-generated insights.

### Rating & Anti-Fraud System
A comprehensive rating system with fraud detection to ensure marketplace trust:
- **Models**: `ContactEvent` (tracks buyer-seller contact events with channel, timestamps), `AdFeedback` (one feedback per contact with 1-5 rating, reason codes, comments)
- **Rating Storage**: Ad model extended with `ratingSummary` (avgScore, totalVotes, lastRatedAt) and `flags` (suspicious, suspiciousReason, markedAt). User model extended with `sellerRating` (avgScore, totalVotes, lowScoreCount, fraudFlags)
- **RatingService**: Core service handling contact logging, feedback submission, rating aggregation, and automatic fraud detection
- **Fraud Detection Heuristics**: Low rating threshold (avg <= 2.5 with 3+ votes marks suspicious), fraud report threshold (2+ fake reports triggers flag), auto-hide (5+ votes with avg <= 2.0 hides ad)
- **Reason Codes**: no_response, wrong_price, wrong_description, fake, rude, other - required for low scores (1-3)
- **API Endpoints**: 
  - `POST /api/rating/ads/:adId/contact` - Log contact event
  - `POST /api/rating/ads/:adId/feedback` - Submit rating (requires valid contact)
  - `GET /api/rating/ads/:adId/rating` - Get ad rating summary
  - `GET /api/rating/sellers/:sellerId/rating` - Get seller rating
  - `GET /api/rating/my/pending-feedback` - Get user's pending feedback requests
  - `GET /api/admin/rating/fraud/overview` - Admin fraud analytics dashboard
  - `GET /api/admin/rating/fraud/suspicious-ads` - List suspicious ads
  - `GET /api/admin/rating/fraud/suspicious-sellers` - List suspicious sellers
  - Admin actions: clear flags, mark suspicious, recalculate ratings
- **UI Components**: `NeonRatingForm` (Matrix/Neon styled rating form with star selection, reason codes, comments), `NeonRatingDisplay` (compact rating display with stars and votes), `AdminFraudTab` (admin fraud analytics dashboard)

### Neon UI Kit (Matrix/Cyberpunk Design System)
A custom component library for analytics visualization with Matrix/Cyberpunk aesthetic:
- **Location**: `miniapp/src/components/ui/neon/`
- **Theme**: `neonTheme.ts` - Color palette (cyan/lime/fuchsia), shadows, gradients, animations
- **CSS**: `neon.css` - Pulse, flicker, glow animations
- **Components**:
  - `NeonCard`, `NeonStatCard` - Glass morphism cards with glow effects
  - `NeonBadge`, `NeonStatusBadge`, `NeonTag` - Status indicators with variants
  - `NeonHistogram` - Animated bar charts with tooltips
  - `NeonLineChart` - Smooth line charts with area fills
  - `NeonGrid`, `NeonGridItem`, `NeonGridSkeleton` - Product grid displays
  - `NeonHeatmap`, `NeonDensityGrid` - Geo-analytics visualization
  - `NeonRatingForm`, `NeonRatingDisplay` - Rating UI with star selection and reason codes
- **Demo Page**: `/miniapp/neon-demo` - Component showcase
- **Analytics Page**: `/miniapp/campaigns/:campaignCode/analytics` - Campaign metrics visualization
- **Tech Stack**: TypeScript, Framer Motion for animations, explicit React type imports (ReactNode, MouseEvent)

## External Dependencies

### Database Services
- **MongoDB Atlas**: Cloud-hosted NoSQL database.

### Third-Party APIs
- **Telegram Bot API**: For all Telegram bot interactions.
- **Nominatim OSM**: For geocoding services.

### Cloud Services
- **Google Cloud Storage**: Used for photo uploads and storage.