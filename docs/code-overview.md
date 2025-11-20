# Codebase Overview

This repository contains a Node.js marketplace backend, a Telegram bot, and a Telegram Mini App front-end built with React/TypeScript. The sections below outline key directories and responsibilities to help orient new contributors.

## Backend services
- **Entry point (`index.js`)**: boots the Express API server and Telegram bot together.
- **Configuration (`config/`)**: centralizes environment variables and constants (for example, MongoDB connection URLs and Telegram tokens).
- **Database (`services/db.js`)**: initializes the MongoDB (Mongoose) connection used across models and routes.
- **Models (`models/`)**: Mongoose schemas for `User`, `Category`, `Season`, `Ad`, and `Order` encapsulate marketplace entities.
- **API (`api/`)**: Express app wiring in `server.js` plus per-resource routers (ads, categories, seasons, orders) under `api/routes/`.
- **Bot (`bot/bot.js`)**: Telegraf bot that exposes commands such as `/start`, `/market`, and `/myorders`, integrating with the API for data.
- **Seed scripts (`scripts/`)**: populate the database with starter categories and seasons via `seedCategories.js` and `npm run seed`.

## Telegram Mini App (web frontend)
- **Client shell (`client/`)**: Vite/React front-end with shadcn/ui components and React Query for data fetching. Shared schemas from `@shared/schema` keep forms and API payloads consistent.
- **Object uploads (`client/src/components/object-uploader.tsx`)**: wraps Uppy with AWS S3 upload parameters and completion callbacks for storing product images.
- **Product management (`client/src/components/product-form.tsx`)**: handles product CRUD forms, image uploads to `/api/objects/upload`, and saves paths through `/api/product-images`.

## Shared types and utilities
- **Shared schema (`shared/schema`)**: exports Zod schemas and TypeScript types for common entities (e.g., `Product`, `Category`), ensuring back-end and front-end alignment.
- **Telegram types (`miniapp/src/types/telegram.d.ts`)**: augments Telegram WebApp typings, including optional username fields and timestamps required by the mini app.
- **In-memory storage (`server/storage.ts`)**: simple storage implementation supplying default role and nullable user profile fields for local/testing contexts.

## Testing and health
- **Health checks**: `/health` endpoint confirms API availability (documented in `README.md`).
- **Type checks**: front-end scripts rely on `npm run check` to validate TypeScript and linting, ensuring Mini App components compile cleanly.
