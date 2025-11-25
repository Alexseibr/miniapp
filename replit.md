# KETMAR Market

## Overview
KETMAR Market is a Telegram-based marketplace for buying and selling goods, featuring seasonal promotions and hierarchical product categories. It integrates a REST API backend, a Telegram bot, a React-based admin panel, and a React-based Telegram MiniApp. The project aims to provide a comprehensive e-commerce platform within Telegram, focusing on intuitive navigation, efficient ad management, and engaging user experiences with features like 3D icons and real-time chat. The business vision is to create a user-friendly and efficient e-commerce solution leveraging the Telegram ecosystem, with ambitions to capture a significant market share in mobile-first online retail.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Category Icons**: Utilizes 3D WebP icons for all categories, with lazy loading and async decoding for performance.
- **Admin Panel**: Features a tabbed design with robust filtering and management tools.
- **MiniApp**: Designed for mobile with a modern ad feed, advanced filtering (category, price range, sorting), infinite scroll using IntersectionObserver, and per-filter-set state management. It integrates `Swiper` for image carousels, `Leaflet` for maps, and `date-fns` for relative timestamps. Geo-location functionality includes "Near Me" search, distance display on ad cards, and a radius slider. Bottom navigation is conditionally displayed only within the Telegram MiniApp environment.

### Technical Implementations
- **Backend**: Node.js with Express.js, providing a RESTful API and Telegram bot logic. It uses JWT authentication for secure endpoints.
- **Data Model**: MongoDB Atlas with Mongoose manages data for User, Category (hierarchical with 3D icon support), Ad (listings with geolocation), and Order entities. A permanent `short_term_rental` Season is configured for promotions.
- **Geo-Search API**: `/api/ads/search` endpoint supports radius-based search using `buyerLat`/`buyerLng` and `maxDistanceKm` parameters. Returns `distanceKm` field (kilometers with 2 decimals) for each result. Fully supports sorting modes: `price_asc`/`price_desc`, `popular` (by views), `newest`/`oldest` (by date), and `distance` (default when geo-coordinates provided).
- **Telegram Bot**: Built with Telegraf, handling user interactions, ad management, and a JWT-authenticated moderation panel.
- **Frontend**: Two React applications built with TypeScript and Vite.
    - **Web Admin Panel**: For managing products, categories, ads, and users. Uses shadcn/ui (Radix UI), TanStack Query, Wouter, and Tailwind CSS. Authentication includes Telegram Login Widget, one-time links, and SMS codes.
    - **Telegram MiniApp**: Mobile user interface with lazy-loaded pages, optimized 3D WebP category icons, and a real-time chat system with 3-second polling. Features production builds, code splitting, and HTTP caching.
- **Image Optimization**: Implements `LazyImage` and `OptimizedImage` components with IntersectionObserver for lazy loading, skeleton shimmers, SVG fallbacks, and priority loading. It includes infrastructure for responsive images (`srcset/sizes`) and leverages server-side media proxy for secure access and caching.
- **Performance Optimizations**: Features code splitting with React.lazy and Suspense, data prefetching (categories, first-page ads), route prefetching on `mouseenter`, Gzip compression, hashed assets with long `Cache-Control` headers, and ETag support. Core Web Vitals are tracked for monitoring.

### System Design Choices
- Modular backend design separating concerns.
- Denormalized Order data for historical integrity.
- Direct GCS public access is prevented; all photo access flows through a server-side proxy for authentication and caching.
- Advanced pagination architecture with per-filter-set state to prevent race conditions.

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