# KETMAR Market

## Overview

KETMAR Market is a Telegram-based marketplace application for buying and selling goods, with support for seasonal promotions and hierarchical product categories. The system combines a REST API backend built with Express.js and MongoDB, alongside a Telegram bot interface powered by Telegraf for user interactions. The application includes two web frontends:
1. **Client App** (React + Vite): Admin panel for marketplace management (/)
2. **MiniApp** (React + Vite): Telegram MiniApp for mobile users (/miniapp)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture

**Framework**: Node.js with Express.js (CommonJS modules)

**Recent Architectural Changes** (November 2025):
- Implemented dual Vite server setup to support both Client App and MiniApp simultaneously
- **Dev Mode**: Two separate Vite instances (clientVite, miniappVite) with different roots
- **Production Mode**: Static serving from miniapp/dist and dist/public
- MiniApp accessible at /miniapp with React Router basename configured
- Middleware order: Telegram webhook → MiniApp handler → MiniApp assets → Client assets

The backend follows a modular architecture with clear separation of concerns:

- **Entry Point** (`index.js`): Orchestrates the simultaneous launch of the Express API server and Telegram bot, with graceful shutdown handling
- **API Layer** (`api/server.js` + `api/routes/`): RESTful API endpoints for categories, seasons, ads (products), and orders
- **Bot Layer** (`bot/bot.js`): Telegram bot handlers for user commands and inline keyboard interactions
- **Service Layer** (`services/db.js`): MongoDB connection management with Mongoose
- **Configuration** (`config/config.js`): Centralized environment variable handling with fallback support for multiple variable naming conventions

**Design Pattern**: The API uses a route-based modular pattern where each resource (ads, categories, seasons, orders) has its own route file. Error handling is implemented through Express middleware with a centralized error handler.

### Data Architecture

**Database**: MongoDB Atlas (NoSQL document database)

**ODM**: Mongoose for schema validation and data modeling

The data model supports a marketplace with the following entities:

1. **User**: Stores Telegram user information (telegramId, username, firstName, lastName, phone, role, privacy settings)
2. **Category**: Hierarchical category system using `parentSlug` for tree structure, with `sortOrder` for display ordering
3. **Season**: Time-bounded promotional periods with start/end dates and active status
4. **Ad** (Product Listing): User-generated listings with title, description, price, photos, category/subcategory references, and optional season association
5. **Order**: Shopping cart system with multiple order items, buyer information, status tracking, and total price calculation

**Key Architectural Decision**: Categories use a slug-based parent-child relationship rather than ObjectId references, making URLs more readable and API responses more intuitive. The `buildTree()` helper function in the categories route reconstructs the hierarchical structure from flat data.

### Telegram Bot Interface

**Framework**: Telegraf (Telegram Bot API wrapper)

The bot provides these core interactions:

- `/start`: Welcome message and command list
- `/myid`: Display user's Telegram ID and profile information  
- `/categories`: Hierarchical category browser with inline keyboards
- `/new_test_ad`: Create sample advertisements for testing
- Inline keyboards for navigation ("Back", "Home", "Next" buttons)

**Design Rationale**: The bot acts as the primary user interface for mobile users, while the web admin panel serves marketplace operators. This dual-interface approach optimizes for the mobile-first nature of Telegram while providing robust management tools.

### Frontend Architecture (Web Admin)

**Framework**: React 18 with TypeScript and Vite

**UI Library**: shadcn/ui components built on Radix UI primitives

**State Management**: TanStack Query (React Query) for server state caching and synchronization

**Routing**: Wouter (lightweight client-side routing)

**Styling**: Tailwind CSS with custom design tokens following Material Design 3 principles

**Key Components**:
- Product management forms with image upload capabilities
- Category management with hierarchical display
- Dashboard with marketplace statistics
- Reusable UI components (buttons, cards, dialogs, forms, tables)

**Design Decision**: The frontend is set up for future expansion but currently serves as an admin panel. The API-first architecture allows for easy integration of additional client applications.

### API Design

**Style**: RESTful HTTP API with JSON payloads

**Key Endpoints**:

- `GET /api/categories` - Returns hierarchical category tree
- `GET /api/seasons` - List all promotional seasons
- `GET /api/seasons/active` - Get currently active seasons
- `GET /api/ads` - List advertisements with optional filters (categoryId, subcategoryId, seasonCode)
- `GET /api/ads/:id` - Get single advertisement
- `POST /api/ads` - Create new advertisement
- `GET /api/orders/:telegramId` - Get user's order history
- `POST /api/orders` - Create new order with automatic price calculation
- `PATCH /api/orders/:id` - Update order status

**Design Rationale**: The API supports both the Telegram bot and web frontend with the same endpoints. Query parameters enable flexible filtering for different use cases (e.g., filtering ads by season for promotional campaigns).

### Configuration Management

**Environment Variables**: Supports dual naming conventions for compatibility:
- `MONGO_URL` or `MONGODB_URI` for database connection
- `BOT_TOKEN` or `TELEGRAM_BOT_TOKEN` for Telegram API access
- `PORT` for API server (default: 3000)
- `API_BASE_URL` for bot-to-API communication

**Rationale**: The dual variable support ensures compatibility with different deployment platforms (Replit, Heroku, local development) without requiring code changes.

### Database Design Decisions

**Hierarchical Categories**: The parent-child slug system allows unlimited nesting depth while maintaining simple queries. The `buildTree()` function server-side ensures clients receive structured data without complex queries.

**Season-Based Promotions**: Ads can optionally link to seasonal promotions via `seasonCode`, enabling time-limited marketplace events (e.g., "March 8 Tulips Sale") without disrupting the core product catalog.

**Order Item Denormalization**: Order items store snapshot data (title, price, quantity) at order creation time, preventing historical order data from changing if the source ad is modified or deleted.

**Embedded vs Referenced**: Photos are stored as URL arrays directly in Ad documents rather than separate Photo documents, reducing query complexity for the common case of displaying ads with images.

## External Dependencies

### Database Services

- **MongoDB Atlas**: Cloud-hosted MongoDB database (connection via Mongoose ODM)
- Connection handled through `services/db.js` with automatic reconnection logic

### Third-Party APIs

- **Telegram Bot API**: All bot interactions go through Telegram's servers
- Managed via Telegraf framework (`bot/bot.js`)
- Requires `BOT_TOKEN` for authentication

### Cloud Services

- **Replit**: Deployment platform (optional, supports local development)
- Environment variables configured through Replit Secrets or `.env` file

### NPM Packages (Key Dependencies)

**Backend**:
- `express`: Web server framework
- `mongoose`: MongoDB ODM
- `telegraf`: Telegram Bot API wrapper  
- `dotenv`: Environment variable management

**Frontend**:
- `react` + `react-dom`: UI framework
- `@tanstack/react-query`: Server state management
- `@radix-ui/*`: Unstyled accessible UI primitives
- `tailwindcss`: Utility-first CSS framework
- `wouter`: Lightweight routing
- `zod`: Schema validation
- `react-hook-form`: Form state management

**Development**:
- `vite`: Frontend build tool and dev server
- `typescript`: Type checking
- `drizzle-orm` + `drizzle-kit`: SQL ORM (configured but not actively used; MongoDB is primary database)

### File Upload (Configured)

- `@uppy/core` + `@uppy/aws-s3`: File upload components for product images
- Requires S3-compatible storage configuration (implementation pending)

**Note**: The application includes PostgreSQL/Drizzle configuration files (`drizzle.config.ts`, `shared/schema.ts`) suggesting a potential future migration or parallel SQL database option, but MongoDB is the active production database.