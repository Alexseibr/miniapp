# KETMAR Market

## Overview
KETMAR Market is a Telegram-based marketplace application for buying and selling goods, featuring seasonal promotions and hierarchical product categories. It integrates a REST API backend, a Telegram bot, a React-based admin panel for marketplace management, and a React-based Telegram MiniApp for mobile users. The project aims to provide a comprehensive and user-friendly platform for e-commerce within the Telegram ecosystem, with a focus on intuitive navigation, efficient ad management, and engaging user experiences through features like 3D icons and real-time chat.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Backend
The backend uses Node.js with Express.js, supporting an API server and Telegram bot logic. It follows a modular design, separating API routes, bot functions, database interactions, and configuration. The API is RESTful with JSON payloads, serving both the Telegram bot and web frontends, and includes JWT authentication for secured endpoints like moderation.

### Data Model
MongoDB Atlas with Mongoose is used for data persistence. Key entities include User, Category (hierarchical with `parentSlug` and support for 3D rendered PNG/WebP icons), Ad (product listings with photo URLs, city, and geolocation), and Order (denormalized for historical data). A permanent `short_term_rental` Season is configured as a promotional block for daily rentals.

### Telegram Bot
Built with Telegraf, the bot handles user commands for navigation, selling, ad management, and accessing specific categories like short-term rentals. It also features a moderation panel with JWT-authenticated workflows for ad approval/rejection.

### Frontend
The project includes two React applications built with TypeScript and Vite:
- **Web Admin Panel**: Manages products, categories, ads (moderation), and users. It uses shadcn/ui (Radix UI), TanStack Query for state, Wouter for routing, and Tailwind CSS for styling. Admin authentication supports Telegram Login Widget, one-time links via bot commands, and phone-based SMS codes, all secured with JWT.
- **Telegram MiniApp**: The mobile user interface, featuring lazy-loaded pages, optimized 3D WebP category icons, and a real-time chat system with 3-second polling for seller-buyer communication. Performance is optimized with Vite production builds, code splitting, and HTTP caching strategies for assets and lazy chunks.

### UI/UX Decisions
- **Category Icons**: Utilizes 3D WebP icons for all categories across hierarchy levels, with lazy loading and async decoding for performance.
- **Admin Panel**: Tabbed design with robust filtering and management tools.
- **MiniApp**: Designed for mobile compatibility within Telegram, with features like `Swiper` for image carousels and `Leaflet` for maps.

## External Dependencies

### Database Services
- **MongoDB Atlas**: Cloud-hosted NoSQL database.

### Third-Party APIs
- **Telegram Bot API**: Core for all bot interactions.

### Cloud Services
- **Replit**: Optional deployment platform.

### NPM Packages (Key)
- **Backend**: `express`, `mongoose`, `telegraf`, `dotenv`.
- **Frontend**: `react`, `react-dom`, `@tanstack/react-query`, `@radix-ui/*`, `tailwindcss`, `wouter`, `zod`, `react-hook-form`, `vite`, `swiper`, `leaflet`, `react-leaflet`.

### File Storage
- **Replit Object Storage**: Using @google-cloud/storage for photo uploads with server-side media proxy.
- **ObjectStorageService** (api/services/objectStorage.js): Handles presigned URL generation for direct browser uploads. Returns proxy URLs (`/api/media/{bucket}/{object}`) instead of direct GCS links.
- **Media Proxy** (api/routes/media.js): GET /api/media/:bucketName/:objectPath(*) streams files from private GCS bucket with proper Content-Type, Cache-Control (1 year), and ETag headers.
- **Photo Upload API**: POST /api/uploads/presigned-url endpoint protected by Telegram auth, returns both upload URL (presigned) and public URL (proxy).
- **ImageUploader Component** (miniapp/src/components/ImageUploader.tsx): Supports file selection and camera capture with client-side validation (10MB max).
- **Architecture Note**: Direct GCS public access is prevented by bucket policy. All photo access flows through server-side proxy for authentication and caching.