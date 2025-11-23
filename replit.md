# KETMAR Market

## Overview

KETMAR Market is a Telegram-based marketplace application for buying and selling goods, featuring seasonal promotions and hierarchical product categories. It comprises a REST API backend (Express.js, MongoDB), a Telegram bot interface (Telegraf), a React-based admin panel for marketplace management, and a React-based Telegram MiniApp for mobile users.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture

The backend uses Node.js with Express.js, orchestrating an API server and Telegram bot. It supports a dual Vite server setup for client and MiniApp frontends. The architecture is modular, separating API, bot logic, database services, and configuration. The API follows a route-based modular pattern with centralized error handling.

### Data Architecture

MongoDB Atlas is used with Mongoose for data modeling. Key entities include User, Category (hierarchical with `parentSlug`), Season, Ad (product listings), and Order. Categories feature a slug-based parent-child relationship for intuitive URLs and support for 3D rendered PNG icons across multiple hierarchy levels, mirroring Kufar.by's taxonomy. Ad documents store photos as URL arrays, and Order items are denormalized to preserve historical data.

### Telegram Bot Interface

Built with Telegraf, the bot handles user commands like `/start`, `/categories`, `/sell` (including geolocation), `/my_ads`, and `/market`. It also features a moderation panel with JWT-authenticated approval/rejection workflows for ads. The bot is the primary mobile interface, complementing the web admin panel.

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