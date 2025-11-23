# 🛒 KETMAR Market

Telegram-based marketplace application for buying and selling goods with seasonal promotions and hierarchical product categories.

[![Telegram Bot](https://img.shields.io/badge/Telegram-@KetmarM__bot-blue?logo=telegram)](https://t.me/KetmarM_bot)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green?logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://www.mongodb.com/)
[![ES Modules](https://img.shields.io/badge/ES-Modules-yellow)](https://nodejs.org/api/esm.html)

## 📋 Features

### Core Functionality
- 🏪 **Marketplace Platform** - Complete buying/selling system for classified ads
- 🏗️ **Hierarchical Categories** - Unlimited-depth category tree with custom WebP icons (inspired by Kufar.by)
- 🏠 **Real Estate Categories** - Specialized rental categories (short-term/long-term)
- 🎯 **Promotional Islands** - Featured listing blocks accessible via deep links
- 🤖 **Telegram Bot Interface** - Primary mobile interface with `/start`, `/categories`, `/sell`, `/my_ads`, `/rental`
- 🔐 **Moderation System** - JWT-authenticated approval/rejection workflows
- 📱 **MiniApp** - React-based Telegram WebView interface
- 🌐 **Admin Panel** - React web dashboard for marketplace management

### Technical Highlights
- ⚡ **ES Modules** - Modern JavaScript module system throughout backend (~60+ files migrated)
- 🎨 **WebP Icons** - 45x optimized category icons (43MB → 1.2MB, 97% reduction)
- 🚀 **Performance Optimized** - Code splitting, lazy loading, HTTP caching (~74KB gzipped total)
- 📦 **Production-Ready** - Aggressive caching strategy for MiniApp assets

## 🏗️ Architecture

### Backend
- **Runtime**: Node.js 20+ with ES Modules
- **Framework**: Express.js REST API
- **Database**: MongoDB Atlas with Mongoose ODM
- **Bot Framework**: Telegraf (Telegram Bot API)
- **Authentication**: JWT for moderation endpoints

### Frontend
- **Admin Panel**: React 18 + TypeScript + Vite
- **MiniApp**: React 18 + TypeScript + Vite (optimized for Telegram WebView)
- **UI Framework**: shadcn/ui (Radix UI primitives)
- **State Management**: TanStack Query v5
- **Routing**: Wouter
- **Styling**: Tailwind CSS

### Data Model
Key entities:
- **User** - Telegram users with roles (user/moderator/admin/seller)
- **Category** - Hierarchical categories with `parentSlug` relationship
- **Season** - Promotional periods/featured blocks
- **Ad** - Product listings with photos, location, pricing
- **Order** - Purchase records with denormalized item data

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- MongoDB Atlas account (or local MongoDB)
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/ketmar-market.git
cd ketmar-market
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/miniapp

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather

# Security
JWT_SECRET=your_random_secret_key_here
SESSION_SECRET=another_random_secret_here

# Server
PORT=5000
NODE_ENV=development

# Optional: For production MiniApp caching
MINIAPP_PRODUCTION=false
```

4. **Seed the database** (optional)
```bash
npm run seed
```

5. **Start the application**
```bash
npm run dev
```

The application will start:
- 🌐 API Server: `http://localhost:5000`
- 🤖 Telegram Bot: Webhook mode (requires public URL)
- 📱 Admin Panel: `http://localhost:5000`
- 📲 MiniApp: `http://localhost:5000/miniapp`

## 📁 Project Structure

```
ketmar-market/
├── api/                    # Express API routes
│   ├── routes/            # API endpoints (ads, categories, orders, etc.)
│   └── server.js          # Express app setup
├── bot/                   # Telegram bot logic
│   ├── commands/          # Bot commands (/start, /categories, etc.)
│   ├── handlers/          # Message/callback handlers
│   └── bot.js            # Telegraf bot setup
├── client/               # React admin panel
│   └── src/
│       ├── pages/        # Admin pages
│       └── components/   # UI components
├── miniapp/              # Telegram MiniApp
│   └── src/
│       ├── pages/        # MiniApp pages
│       └── components/   # MiniApp components
├── models/               # Mongoose schemas (ES modules)
│   ├── User.js
│   ├── Category.js
│   ├── Ad.js
│   └── Order.js
├── services/             # Business logic
│   ├── db.js            # MongoDB connection
│   └── notificationService.js
├── middleware/           # Express middleware
├── config/              # Configuration
│   └── config.js        # Environment config
├── index.js             # Main entry point (ES modules)
└── package.json         # Dependencies
```

## 🎯 Key Features Implementation

### Real Estate Categories
The project includes a specialized hierarchy for rental properties:

```
realty (Недвижимость)
├── realty_rent (Аренда)
│   ├── realty_rent_daily (Посуточно) - Short-term rentals
│   └── realty_rent_long (Долгосрочная) - Long-term rentals
```

### Promotional Islands
Special seasonal promotions (e.g., `short_term_rental`) are featured prominently:
- Accessible via `/rental` bot command
- Deep-linkable for dedicated bot instances
- Displayed in MiniApp feed

### Category Icons
58 WebP-optimized icons across 4 hierarchy levels:
- Level 1: 14 icons (~15-30KB each)
- Level 2: 30 icons (~12-20KB each)  
- Level 3: 11 icons (~15-30KB each)
- Level 4: 3 icons (~28-52KB each)

## 🔧 API Endpoints

### Health & Info
- `GET /` - API information
- `GET /health` - Health check endpoint

### Categories
- `GET /api/categories` - Get hierarchical category tree

### Seasons
- `GET /api/seasons` - List all seasons
- `GET /api/seasons/active` - Get only active seasons

### Ads
- `GET /api/ads` - List ads (supports filtering)
  - Query params: `limit`, `offset`, `categoryId`, `subcategoryId`, `seasonCode`, `sellerTelegramId`, `q`, `minPrice`, `maxPrice`
- `GET /api/ads/:id` - Get ad by ID
- `POST /api/ads` - Create new ad
- `GET /api/ads/nearby?lat=...&lng=...&radiusKm=...` - Nearby ads (geospatial)

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/:buyerTelegramId` - Get buyer's orders

### Moderation (JWT protected)
- `POST /api/moderation/approve/:adId` - Approve ad
- `POST /api/moderation/reject/:adId` - Reject ad

## 🤖 Bot Commands

### Available Commands
- `/start` - Welcome message & bot introduction
- `/myid` - Get your Telegram user ID
- `/categories` - Browse product categories
- `/sell` - Create new listing (with geolocation)
- `/my_ads` - View your active listings
- `/market` - Browse marketplace by category
- `/rental` - Quick access to short-term rentals
- `/new_test_ad` - Create test advertisement (dev)

## 🛠️ Development

### Available NPM Scripts
```bash
npm run dev          # Start development server
npm run build        # Build production bundles
npm run start        # Start production server
npm run seed         # Seed database with initial data
```

### ES Modules Guidelines
The project uses ES modules throughout:
- All imports require `.js` extensions for local files
- Use `import.meta.dirname` instead of `__dirname`
- Named exports preferred over default exports

### Configuration Management
File `config/config.js` supports dual naming conventions:
- `MONGO_URL` or `MONGODB_URI`
- `BOT_TOKEN` or `TELEGRAM_BOT_TOKEN`

## 📊 Performance Metrics

### MiniApp Bundle Size
- Total JavaScript: ~217KB raw (~74KB gzipped)
- Main bundle: 57.91KB (23.02KB gzipped)
- Vendor chunks: React (164KB/53KB), UI (3.72KB/1.63KB)
- Lazy pages: 9 pages (3-14KB each)

### Load Performance
- Initial load: ~600ms DOMContentLoaded
- Cached reload: <50ms (14x faster)
- Lazy chunks: <200ms first load
- Category icons: Near-instant with lazy loading

### HTTP Caching Strategy
- **Hashed assets**: `max-age=31536000, immutable` (1 year)
- **HTML files**: `no-cache, must-revalidate`
- **Lazy chunks**: Cached with immutable headers
- **Enabled via**: `NODE_ENV=production` + `MINIAPP_PRODUCTION=true`

## 🔐 Security

- JWT authentication for moderation endpoints
- Session management with `express-session`
- Environment variable protection (`.env` excluded from git)
- Mongoose schema validation
- Input sanitization in forms
- Webhook mode for Telegram bot (secure)

## 🧪 Testing

### Test API Endpoints
```bash
# Health check
curl http://localhost:5000/health

# Categories
curl http://localhost:5000/api/categories

# Active seasons
curl http://localhost:5000/api/seasons/active

# List ads
curl http://localhost:5000/api/ads

# Nearby ads (geospatial)
curl "http://localhost:5000/api/ads/nearby?lat=52.1&lng=23.7&radiusKm=5"
```

### Test Telegram Bot
1. Find your bot in Telegram
2. Send `/start`
3. Try `/categories` - view category tree
4. Try `/new_test_ad` - create test ad
5. Check `/myid` - get your Telegram ID

## 🚢 Deployment

### Webhook Configuration
For production deployment, the bot automatically sets webhook:

```javascript
// Configured in bot/bot.js
const webhookUrl = `${process.env.REPLIT_DEV_DOMAIN}/telegram-webhook`;
await bot.telegram.setWebhook(webhookUrl);
```

### MiniApp Production Caching
Enable production optimizations:

```env
NODE_ENV=production
MINIAPP_PRODUCTION=true
```

This enables:
- Long-term caching for hashed assets
- Instant navigation with cached lazy chunks
- HTML revalidation on deployments

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- Use ES modules (`.js` extensions required)
- Follow existing naming conventions
- Add JSDoc comments for complex functions
- Run tests before committing

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

**KETMAR Market Team**

## 🙏 Acknowledgments

- Inspired by [Kufar.by](https://kufar.by) design patterns
- Built on Replit platform
- Telegram Bot API & MiniApps documentation
- shadcn/ui component library
- MongoDB Atlas for database hosting

## 📞 Support

For support and questions:
- 🐛 Open an issue on GitHub
- 💬 Contact via Telegram: [@KetmarM_bot](https://t.me/KetmarM_bot)

## 📚 Documentation

For detailed technical documentation, see:
- [API Documentation](./docs/API.md) (coming soon)
- [Bot Commands](./docs/BOT_COMMANDS.md) (coming soon)
- [Database Schema](./docs/DATABASE.md) (coming soon)

---

**Made with ❤️ using Node.js, React, MongoDB, and Telegram Bot API**

🚀 **[Try it now on Telegram](https://t.me/KetmarM_bot)**
