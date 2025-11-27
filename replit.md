# KETMAR Market

## Overview
KETMAR Market is a Telegram-based marketplace for buying and selling goods, featuring seasonal promotions and a hierarchical product categorization system. It includes a REST API backend, a Telegram bot, a React administration panel, and a React-based Telegram MiniApp. The project aims to provide a comprehensive and intuitive e-commerce experience within Telegram, focusing on efficient advertisement management, engaging user interfaces with 3D icons, and real-time chat. The business vision is to establish a user-friendly e-commerce platform leveraging the Telegram ecosystem to capture a significant share of the mobile-first online retail market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The MiniApp features a fixed layout with a scrollable content area, sticky header, and fixed bottom tabs with safe area padding. Ad cards display price, title, and location with distance. Category icons utilize 3D WebP images with lazy loading. The Admin Panel uses a tabbed interface for robust management. The MiniApp is mobile-first, with "radius-first" navigation, elderly-friendly sizing, and accessibility features like large fonts and high contrast.

### Technical Implementations
The backend is built with Node.js and Express.js, providing RESTful APIs and Telegram bot logic, secured by JWT authentication. Data is stored in MongoDB Atlas using Mongoose, with models for Users, hierarchical Categories, Ads (including geolocation and contact info), and Orders, supporting seasonal promotions. Geocoding is handled by Nominatim OSM with preset fallbacks. Geo-search supports radius-based queries. The Telegram bot uses Telegraf for user interaction and an authenticated moderation panel.

The frontend consists of two React applications using TypeScript and Vite:
- **Web Admin Panel**: Manages products, categories, ads, and users, utilizing shadcn/ui, TanStack Query, Wouter, and Tailwind CSS. Supports Telegram Login, one-time links, and SMS for authentication.
- **Telegram MiniApp**: Mobile-optimized UI with lazy-loaded pages and 3D WebP icons, featuring a 4-step ad creation wizard with auto-geolocation and scheduled publishing, custom hooks for debounced fetching, and specialized pages.

Image optimization includes lazy loading, skeleton shimmers, responsive images, and a server-side media proxy. Performance optimizations leverage code splitting, data prefetching, Gzip compression, and ETag support.

### System Design Choices
The system features a modular backend with separation of concerns. Order data is denormalized for historical integrity, and all photo access is routed through a secure server-side proxy. A "radius-first" architecture governs ad listings, with debounced fetching for API calls.

A Fast Market Scoring System ranks ads by distance, freshness, and engagement, with category boosts. An AI-powered Farmer Tips Service provides demand recommendations. Ads support deferred publishing with a cron worker. A Price Comparison System offers market analytics. Users can favorite ads with notifications via a Favorites System, and Ad History Tracking monitors ad lifecycles.

Category management includes Auto-Suggestion, an Evolution System for gradual hierarchy growth, and Dynamic Visibility based on ad counts and geo-location. A Smart Search System offers fuzzy matching and category suggestions. Local Trends Analytics tracks demand/supply spikes, and a Hot Search System aggregates popular geo-located searches. A Scope Toggle allows switching between "local" and "country" ad listings.

A specialized Farmer Category System supports agricultural products with unit types and quick-post features. A Farmer Cabinet Dashboard provides a comprehensive seller interface with product management, analytics, and local demand tracking. A Farmer Monetization System offers a three-tier subscription model. A Seasonal Fairs System integrates predefined events.

The Media Upload System manages file size, thumbnails, and cleanup. The Ad Lifecycle System handles expiration, extension, and republishing based on category-specific rules. Search Alerts and Demand Notification systems provide user and seller notifications, respectively.

An AI Layer provides unified services for text generation, personalized recommendations (feed, similar ads, trending nearby), and content moderation, learning from user activity. A Geo-Intelligence Map System offers real-time geo-analytics with heatmaps, clustered ad markers, and smart geo-recommendations, tracking user geo-activity and using interactive Leaflet maps.

A Multi-Platform Authentication System provides unified JWT-based authentication across MiniApp, Web, and Mobile WebView, with platform adapters, SMS verification, and account merging logic.

A Seller Stores System enables dedicated storefronts with customizable profiles, subscriptions, reviews, notifications, and deep link support. Store PRO Analytics offers an advanced dashboard for store owners with daily stats, KPI cards, time-series charts, conversion funnels, top product rankings, geographic analysis, campaign tracking, audience segmentation, and CSV export.

MEGA-ANALYTICS 10.0 provides professional marketplace-level seller analytics with event tracking, an analytics engine, overview dashboards, price position analysis, category performance insights, geo-analytics, AI suggestions, and warnings.

MEGA-PROMPT 14.0 Digital Twin is an AI-powered personalized shopping assistant with a UserTwin model tracking interests, a service for AI chat, context-aware recommendations, notifications, watchlist management, and interest learning.

MEGA-PROMPT 13.0 AI Dynamic Pricing offers Uber-style surge pricing optimization for sellers, analyzing demand, competition, seasonality, timing, and buyer activity to provide price recommendations, market position detection, and potential buyer estimations. It includes a PriceWatcher worker for market monitoring and seller alerts.

MEGA-PROMPT 15.0 Seller's Digital Twin is an AI-powered business assistant for sellers, tracking inventory, providing listing quality analysis, demand prediction, competitive analysis, product suggestions, optimal publishing times, and market change monitoring.

MEGA-PROMPT 17.0 AI Recommendations provides a TikTok-style personalized product feed using a RecommendationEngine with multi-factor scoring (similarity, geo-proximity, trending, quality, seller affinity), user context extraction, candidate retrieval, and AI-generated insights.

## External Dependencies

### Database Services
- **MongoDB Atlas**: Cloud-hosted NoSQL database.

### Third-Party APIs
- **Telegram Bot API**: For all Telegram bot interactions.
- **Nominatim OSM**: For geocoding services.

### Cloud Services
- **Google Cloud Storage**: Used for photo uploads and storage.