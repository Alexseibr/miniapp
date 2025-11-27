# KETMAR Market API Documentation

Complete REST API reference for the KETMAR Market platform.

**Base URL:** `https://your-domain.com/api`

**Authentication:** Most endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

---

## Table of Contents

1. [Authentication](#authentication)
2. [Ads (Listings)](#ads-listings)
3. [Categories](#categories)
4. [Geolocation](#geolocation)
5. [Search](#search)
6. [Favorites](#favorites)
7. [Chat](#chat)
8. [Orders](#orders)
9. [Rating & Anti-Fraud](#rating--anti-fraud)
10. [Seller Profile & Stores](#seller-profile--stores)
11. [Seller Analytics](#seller-analytics)
12. [Farmer Module](#farmer-module)
13. [AI Services](#ai-services)
14. [Recommendations](#recommendations)
15. [Dynamic Pricing](#dynamic-pricing)
16. [Media & Uploads](#media--uploads)
17. [Admin Endpoints](#admin-endpoints)

---

## Authentication

### Telegram Login

**POST** `/auth/telegram`

Authenticate user via Telegram WebApp initData.

**Request Body:**
```json
{
  "initData": "query_id=AAHdF...&user=%7B%22id%22%3A123...&hash=abc123...",
  "phone": "+375291234567"
}
```

**Response:**
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "telegramId": 123456789,
    "username": "john_doe",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+375291234567",
    "phoneVerified": true,
    "role": "user"
  }
}
```

---

### Telegram Init (with phone linking)

**POST** `/auth/telegram-init`

New Telegram authentication with optional phone linking.

**Request Body:**
```json
{
  "initData": "query_id=AAHdF...&user=%7B%22id%22%3A123...&hash=abc123...",
  "phone": "+375291234567"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... },
  "isNewUser": false,
  "merged": false
}
```

---

### SMS Request Code

**POST** `/auth/sms/request`

Request SMS verification code for login.

**Request Body:**
```json
{
  "phone": "+375291234567",
  "platform": "web"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Code sent",
  "expiresIn": 300
}
```

**Error (429):**
```json
{
  "success": false,
  "error": "too_many_requests",
  "retryAfter": 60
}
```

---

### SMS Verify Code

**POST** `/auth/sms/verify`

Verify SMS code and authenticate.

**Request Body:**
```json
{
  "phone": "+375291234567",
  "code": "1234",
  "platform": "web"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "phone": "+375291234567",
    "phoneVerified": true
  },
  "isNewUser": true
}
```

---

### Link Phone to Account

**POST** `/auth/link-phone/request`

Request SMS code to link phone to current Telegram account.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "phone": "+375291234567"
}
```

---

**POST** `/auth/link-phone/verify`

Verify SMS and link phone (merges accounts if phone exists).

**Request Body:**
```json
{
  "phone": "+375291234567",
  "code": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "merged": true,
  "mergedAdsCount": 5,
  "mergedFavoritesCount": 3
}
```

---

### Get Current User

**GET** `/auth/me`

Get authenticated user profile.

**Response:**
```json
{
  "ok": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "telegramId": 123456789,
    "phone": "+375291234567",
    "username": "john_doe",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## Ads (Listings)

### List Ads

**GET** `/ads`

Get list of ads with filtering, geo-search, and pagination.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Items per page (default: 20, max: 100) |
| `offset` | number | Skip items for pagination |
| `categoryId` | string | Filter by category slug |
| `subcategoryId` | string | Filter by subcategory slug |
| `seasonCode` | string | Filter by season/campaign code |
| `status` | string | Filter by status (active, sold, archived) |
| `lat` | number | User latitude for geo-search |
| `lng` | number | User longitude for geo-search |
| `radiusKm` | number | Search radius in kilometers |
| `q` | string | Search query |
| `minPrice` | number | Minimum price filter |
| `maxPrice` | number | Maximum price filter |
| `sort` | string | Sort: `newest`, `price_asc`, `price_desc`, `distance` |

**Response:**
```json
{
  "items": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "iPhone 15 Pro Max 256GB",
      "description": "Новый, в пленках...",
      "price": 3500,
      "currency": "BYN",
      "categoryId": "electronics",
      "subcategoryId": "phones",
      "photos": ["https://storage.../photo1.webp"],
      "previewUrl": "https://storage.../preview.webp",
      "location": {
        "lat": 53.9045,
        "lng": 27.5615,
        "city": "Минск",
        "district": "Центральный"
      },
      "distanceMeters": 1250,
      "status": "active",
      "sellerTelegramId": 123456789,
      "ratingSummary": {
        "avgScore": 4.5,
        "totalVotes": 12
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "hasMore": true
}
```

---

### Get Ad by ID

**GET** `/ads/:id`

Get single ad with full details.

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "iPhone 15 Pro Max 256GB",
  "description": "Новый, в пленках. Полный комплект.",
  "price": 3500,
  "currency": "BYN",
  "categoryId": "electronics",
  "subcategoryId": "phones",
  "photos": [
    "https://storage.../photo1.webp",
    "https://storage.../photo2.webp"
  ],
  "previewUrl": "https://storage.../preview.webp",
  "location": {
    "lat": 53.9045,
    "lng": 27.5615,
    "city": "Минск",
    "area": "Минская область",
    "district": "Центральный",
    "geo": {
      "type": "Point",
      "coordinates": [27.5615, 53.9045]
    }
  },
  "contact": {
    "phone": "+375291234567",
    "showPhone": true,
    "preferredContact": "telegram"
  },
  "status": "active",
  "moderationStatus": "approved",
  "sellerTelegramId": 123456789,
  "sellerId": "507f1f77bcf86cd799439012",
  "viewsCount": 245,
  "contactsCount": 18,
  "favoritesCount": 7,
  "ratingSummary": {
    "avgScore": 4.5,
    "totalVotes": 12,
    "lastRatedAt": "2024-01-20T15:00:00Z"
  },
  "validUntil": "2024-02-15T10:30:00Z",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-18T14:20:00Z"
}
```

---

### Create Ad

**POST** `/ads`

Create new ad listing.

**Request Body:**
```json
{
  "title": "iPhone 15 Pro Max 256GB",
  "description": "Новый, в пленках. Полный комплект.",
  "price": 3500,
  "currency": "BYN",
  "categoryId": "electronics",
  "subcategoryId": "phones",
  "photos": [
    "https://storage.../photo1.webp"
  ],
  "location": {
    "lat": 53.9045,
    "lng": 27.5615,
    "city": "Минск"
  },
  "contact": {
    "phone": "+375291234567",
    "showPhone": true
  },
  "publishAt": "2024-01-20T10:00:00Z",
  "seasonCode": "winter_sale"
}
```

**Response:**
```json
{
  "success": true,
  "ad": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "iPhone 15 Pro Max 256GB",
    "status": "pending",
    "moderationStatus": "pending"
  }
}
```

---

### Update Ad

**PUT** `/ads/:id`

Update existing ad.

**Request Body:**
```json
{
  "title": "iPhone 15 Pro Max 256GB (UPDATED)",
  "price": 3400,
  "description": "Updated description..."
}
```

---

### Delete Ad

**DELETE** `/ads/:id`

Delete ad (soft delete - sets status to 'deleted').

---

### Get My Ads

**GET** `/ads/my`

Get current user's ads.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter: `active`, `pending`, `sold`, `archived`, `expired` |
| `limit` | number | Items per page |
| `offset` | number | Pagination offset |

---

### Nearby Ads (Geo-Search)

**GET** `/ads/nearby`

Find ads within radius using MongoDB $geoNear.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat` | number | Yes | User latitude |
| `lng` | number | Yes | User longitude |
| `radiusKm` | number | No | Radius (default: 10, max: 100) |
| `categoryId` | string | No | Filter by category |
| `limit` | number | No | Max results (default: 50) |

**Response:**
```json
{
  "items": [
    {
      "_id": "...",
      "title": "...",
      "distanceMeters": 1250
    }
  ],
  "total": 25
}
```

---

### Extend Ad Validity

**POST** `/ads/:id/extend`

Extend ad validity period.

**Request Body:**
```json
{
  "days": 30
}
```

**Response:**
```json
{
  "success": true,
  "validUntil": "2024-03-15T10:30:00Z"
}
```

---

### Track Ad Events

**POST** `/ads/:id/track-impression`

Track ad impression in feed.

---

**POST** `/ads/:id/track-view`

Track ad detail page view.

---

**POST** `/ads/:id/track-contact`

Track contact button click.

---

### Similar Ads

**GET** `/ads/:id/similar`

Get similar ads based on category, price, location.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max results (default: 10) |

---

### Trending Ads

**GET** `/ads/trending`

Get trending ads based on views and engagement.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `lat` | number | User latitude |
| `lng` | number | User longitude |
| `radiusKm` | number | Radius (default: 50) |
| `limit` | number | Max results |

---

## Categories

### List Categories

**GET** `/categories`

Get hierarchical category tree.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `includeAll` | boolean | Include hidden categories |
| `flat` | boolean | Return flat list instead of tree |

**Response:**
```json
{
  "items": [
    {
      "_id": "...",
      "slug": "electronics",
      "name": "Электроника",
      "icon": "https://storage.../electronics.webp",
      "order": 1,
      "adCount": 1250,
      "children": [
        {
          "slug": "phones",
          "name": "Телефоны",
          "parentSlug": "electronics",
          "adCount": 450
        }
      ]
    }
  ]
}
```

---

### Visible Categories

**GET** `/categories/visible`

Get categories visible based on location and ad counts.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `lat` | number | User latitude |
| `lng` | number | User longitude |
| `scope` | string | `local` or `country` |

---

### Suggest Category

**POST** `/categories/suggest`

AI-powered category suggestion based on title/description.

**Request Body:**
```json
{
  "title": "iPhone 15 Pro Max",
  "description": "Новый телефон Apple"
}
```

**Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "categoryId": "electronics",
      "subcategoryId": "phones",
      "confidence": 0.95,
      "categoryName": "Электроника",
      "subcategoryName": "Телефоны"
    }
  ]
}
```

---

## Geolocation

### Full Geo-Feed

**GET** `/geo/full-feed`

Comprehensive feed with ads, clusters, farmers, seasonal items.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lat` | number | Yes | User latitude |
| `lng` | number | Yes | User longitude |
| `radiusKm` | number | No | Radius (default: 10) |
| `categoryId` | string | No | Category filter |

**Response:**
```json
{
  "ads": [...],
  "clusters": [
    {
      "lat": 53.9,
      "lng": 27.5,
      "count": 15,
      "bounds": {...}
    }
  ],
  "farmers": [...],
  "seasonal": [...],
  "aiHints": [
    {
      "type": "demand",
      "message": "Высокий спрос на велосипеды в вашем районе"
    }
  ]
}
```

---

### Hotspots

**GET** `/geo/hotspots`

Get demand/supply hotspots.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `lat` | number | Center latitude |
| `lng` | number | Center longitude |
| `type` | string | `demand`, `supply`, or `opportunity` |
| `categoryId` | string | Category filter |

---

### Resolve Coordinates

**POST** `/geo/resolve`

Reverse geocoding - coordinates to address.

**Request Body:**
```json
{
  "lat": 53.9045,
  "lng": 27.5615
}
```

**Response:**
```json
{
  "success": true,
  "location": {
    "city": "Минск",
    "area": "Минская область",
    "district": "Центральный район",
    "street": "ул. Ленина",
    "country": "Беларусь"
  }
}
```

---

### Preset Locations

**GET** `/geo/preset-locations`

Get list of preset city locations.

**Response:**
```json
{
  "locations": [
    {
      "name": "Минск",
      "lat": 53.9045,
      "lng": 27.5615
    },
    {
      "name": "Брест",
      "lat": 52.0976,
      "lng": 23.7341
    }
  ]
}
```

---

## Search

### Smart Search

**GET** `/search/search`

Universal search with fuzzy matching and category suggestions.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query |
| `lat` | number | User latitude |
| `lng` | number | User longitude |
| `radiusKm` | number | Radius filter |
| `categoryId` | string | Category filter |
| `sort` | string | Sort option |
| `limit` | number | Max results |

**Response:**
```json
{
  "items": [...],
  "total": 45,
  "suggestions": [
    {
      "type": "category",
      "slug": "phones",
      "name": "Телефоны"
    },
    {
      "type": "query",
      "text": "iphone 15 pro"
    }
  ],
  "didYouMean": "iPhone"
}
```

---

### Hot Searches

**GET** `/search/hot`

Get trending search queries.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `lat` | number | User latitude |
| `lng` | number | User longitude |
| `limit` | number | Max results (default: 10) |

**Response:**
```json
{
  "items": [
    {
      "query": "iPhone 15",
      "count": 245,
      "trend": "up"
    }
  ]
}
```

---

### Search Alerts

**POST** `/search/alerts`

Create/update search alert subscription.

**Request Body:**
```json
{
  "query": "iPhone 15",
  "categoryId": "phones",
  "maxPrice": 3000,
  "radiusKm": 20,
  "lat": 53.9,
  "lng": 27.5
}
```

---

**GET** `/search/alerts/my`

Get user's search alerts.

---

**POST** `/search/alerts/:id/deactivate`

Deactivate a search alert.

---

## Favorites

### Get My Favorites

**GET** `/favorites/my`

Get current user's favorite ads.

**Response:**
```json
{
  "items": [
    {
      "adId": "507f1f77bcf86cd799439011",
      "ad": {
        "title": "iPhone 15",
        "price": 3500
      },
      "addedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 5
}
```

---

### Add to Favorites

**POST** `/favorites`

**Request Body:**
```json
{
  "adId": "507f1f77bcf86cd799439011"
}
```

---

### Remove from Favorites

**DELETE** `/favorites/:adId`

---

## Chat

### Start Conversation

**POST** `/chat/start`

Start new conversation about an ad.

**Request Body:**
```json
{
  "adId": "507f1f77bcf86cd799439011",
  "message": "Здравствуйте! Товар ещё актуален?"
}
```

**Response:**
```json
{
  "success": true,
  "conversation": {
    "_id": "507f1f77bcf86cd799439012",
    "adId": "507f1f77bcf86cd799439011",
    "participants": [123456789, 987654321],
    "lastMessage": {...}
  }
}
```

---

### Get My Conversations

**GET** `/chat/my`

**Response:**
```json
{
  "items": [
    {
      "_id": "...",
      "ad": {
        "title": "iPhone 15",
        "previewUrl": "..."
      },
      "otherUser": {
        "username": "seller_john",
        "firstName": "John"
      },
      "lastMessage": {
        "text": "Да, актуален!",
        "createdAt": "2024-01-15T12:00:00Z"
      },
      "unreadCount": 2
    }
  ]
}
```

---

### Get Messages

**GET** `/chat/:conversationId/messages`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Messages per page |
| `before` | string | Cursor for pagination |

---

### Send Message

**POST** `/chat/:conversationId/messages`

**Request Body:**
```json
{
  "text": "Можно посмотреть сегодня?"
}
```

---

### Poll for New Messages

**GET** `/chat/:conversationId/poll`

Long-polling endpoint for real-time updates.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `since` | string | Last message timestamp |

---

## Orders

### Create Order

**POST** `/orders`

**Request Body:**
```json
{
  "items": [
    {
      "adId": "507f1f77bcf86cd799439011",
      "quantity": 1
    }
  ],
  "buyerName": "Иван Иванов",
  "buyerPhone": "+375291234567",
  "comment": "Доставка после 18:00",
  "seasonCode": "winter_sale"
}
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "items": [
    {
      "adId": "...",
      "title": "iPhone 15",
      "price": 3500,
      "quantity": 1,
      "sellerTelegramId": 123456789
    }
  ],
  "totalPrice": 3500,
  "status": "new"
}
```

---

### Get My Orders

**GET** `/orders/my`

---

### Accept Order (Seller)

**POST** `/orders/:id/accept`

**Request Body:**
```json
{
  "sellerTelegramId": 123456789
}
```

---

### Update Order Status

**PATCH** `/orders/:id`

**Request Body:**
```json
{
  "status": "completed"
}
```

Allowed statuses: `new`, `processed`, `completed`, `cancelled`

---

## Rating & Anti-Fraud

### Log Contact Event

**POST** `/rating/ads/:adId/contact`

Log buyer-seller contact (required before rating).

**Request Body:**
```json
{
  "channel": "phone"
}
```

Channel options: `phone`, `telegram`, `chat`, `whatsapp`

---

### Submit Rating

**POST** `/rating/ads/:adId/feedback`

Submit rating for an ad (requires valid contact event).

**Request Body:**
```json
{
  "score": 4,
  "reasonCode": null,
  "comment": "Отличный продавец!"
}
```

For low scores (1-3), `reasonCode` is required:
- `no_response` - Продавец не ответил
- `wrong_price` - Цена не соответствует
- `wrong_description` - Описание не соответствует
- `fake` - Объявление поддельное
- `rude` - Грубое общение

---

### Get Ad Rating

**GET** `/rating/ads/:adId/rating`

**Response:**
```json
{
  "avgScore": 4.5,
  "totalVotes": 12,
  "distribution": {
    "5": 8,
    "4": 3,
    "3": 1,
    "2": 0,
    "1": 0
  },
  "reasonBreakdown": {
    "no_response": 0,
    "wrong_price": 1
  }
}
```

---

### Get Seller Rating

**GET** `/rating/sellers/:sellerId/rating`

---

### Get Pending Feedback

**GET** `/rating/my/pending-feedback`

Get user's pending feedback requests.

**Response:**
```json
{
  "items": [
    {
      "adId": "...",
      "adTitle": "iPhone 15",
      "contactedAt": "2024-01-15T10:00:00Z",
      "sellerName": "John"
    }
  ]
}
```

---

## Seller Profile & Stores

### Create Seller Profile

**POST** `/seller-profile`

**Request Body:**
```json
{
  "storeName": "TechStore",
  "slug": "techstore",
  "description": "Магазин электроники",
  "logo": "https://storage.../logo.webp",
  "banner": "https://storage.../banner.webp",
  "contacts": {
    "phone": "+375291234567",
    "telegram": "@techstore"
  }
}
```

---

### Get My Seller Profile

**GET** `/seller-profile/my`

---

### Get Seller Profile by Slug

**GET** `/seller-profile/:identifier`

Works with slug or ID.

**Response:**
```json
{
  "_id": "...",
  "storeName": "TechStore",
  "slug": "techstore",
  "description": "Магазин электроники",
  "logo": "...",
  "rating": {
    "avgScore": 4.7,
    "totalReviews": 45
  },
  "stats": {
    "totalAds": 120,
    "activeAds": 85,
    "totalSales": 230
  },
  "subscription": {
    "tier": "pro",
    "expiresAt": "2024-12-31"
  }
}
```

---

### Get Seller Items

**GET** `/seller-profile/:identifier/items`

---

### Seller Reviews

**POST** `/seller-reviews/:sellerId`

Submit review for seller.

**Request Body:**
```json
{
  "score": 5,
  "text": "Отличный магазин!",
  "orderId": "..."
}
```

---

**GET** `/seller-reviews/:sellerId`

Get seller reviews with pagination.

---

## Seller Analytics

### PRO Analytics Overview

**GET** `/seller-profile/my/stats`

**Response:**
```json
{
  "overview": {
    "totalViews": 12500,
    "totalContacts": 450,
    "conversionRate": 3.6,
    "avgResponseTime": "2h 15m"
  },
  "daily": [
    {
      "date": "2024-01-15",
      "views": 250,
      "contacts": 12,
      "sales": 3
    }
  ],
  "topProducts": [...],
  "geoDistribution": {...}
}
```

---

### Store PRO Analytics

**GET** `/store-pro-analytics/overview`

Extended analytics for PRO subscribers.

**Response:**
```json
{
  "kpis": {
    "views": { "value": 12500, "change": 15.2 },
    "contacts": { "value": 450, "change": -3.5 },
    "conversion": { "value": 3.6, "change": 0.8 }
  },
  "funnel": {
    "impressions": 50000,
    "views": 12500,
    "contacts": 450,
    "sales": 120
  },
  "topCategories": [...],
  "geoHeatmap": [...],
  "competitorAnalysis": {...}
}
```

---

## Farmer Module

### Farmer Categories

**GET** `/farmer/categories`

Get farmer-specific categories.

---

### Quick Post

**POST** `/farmer/quick-post`

Fast farmer ad creation.

**Request Body:**
```json
{
  "productKey": "potato",
  "quantity": 100,
  "unitType": "kg",
  "pricePerUnit": 2.5,
  "location": {
    "lat": 53.9,
    "lng": 27.5
  },
  "isOrganic": true
}
```

---

### Local Demand

**GET** `/farmer/local-demand`

Get local demand trends for farmer products.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `lat` | number | User latitude |
| `lng` | number | User longitude |
| `radiusKm` | number | Radius |

**Response:**
```json
{
  "items": [
    {
      "productKey": "tomato",
      "productName": "Помидоры",
      "demandScore": 85,
      "searchCount": 120,
      "avgPrice": 8.5,
      "trend": "rising"
    }
  ]
}
```

---

### Farmer Analytics

**GET** `/farmer/my-analytics`

Get seller's farmer analytics.

---

### Season Events

**GET** `/farmer/season-events`

Get upcoming seasonal events/fairs.

---

## AI Services

### Suggest Title

**POST** `/ai/suggest-title`

**Request Body:**
```json
{
  "description": "Новый телефон Apple, 256 гб памяти",
  "categoryId": "phones"
}
```

**Response:**
```json
{
  "suggestions": [
    "iPhone 15 Pro Max 256GB новый",
    "Apple iPhone 15 Pro Max 256 ГБ"
  ]
}
```

---

### Suggest Description

**POST** `/ai/suggest-description`

**Request Body:**
```json
{
  "title": "iPhone 15 Pro Max",
  "categoryId": "phones",
  "price": 3500
}
```

---

### Auto-Categorize

**POST** `/ai/category`

**Request Body:**
```json
{
  "title": "Велосипед горный Stels",
  "description": "26 дюймов, 21 скорость"
}
```

**Response:**
```json
{
  "categoryId": "sports",
  "subcategoryId": "bicycles",
  "confidence": 0.92
}
```

---

### Content Moderation

**POST** `/ai/moderation`

Check ad content for policy violations.

**Request Body:**
```json
{
  "title": "iPhone 15",
  "description": "...",
  "photos": ["..."]
}
```

**Response:**
```json
{
  "approved": true,
  "issues": [],
  "suggestions": [
    "Добавьте больше фотографий товара"
  ]
}
```

---

## Recommendations

### Personalized Feed

**GET** `/recommendations/feed`

TikTok-style personalized recommendations.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `lat` | number | User latitude |
| `lng` | number | User longitude |
| `limit` | number | Max items |

**Response:**
```json
{
  "items": [
    {
      "ad": {...},
      "score": 0.95,
      "reason": "similar_to_viewed",
      "insight": "Похоже на то, что вы недавно смотрели"
    }
  ]
}
```

---

### Similar Ads

**GET** `/recommendations/similar/:adId`

---

### Trending Nearby

**GET** `/recommendations/trending-nearby`

---

## Dynamic Pricing

### Analyze Ad Price

**GET** `/dynamicPrice/analyze/:adId`

Get pricing recommendations.

**Response:**
```json
{
  "currentPrice": 3500,
  "recommendedPrice": 3200,
  "marketPosition": "above_average",
  "competitors": {
    "count": 12,
    "avgPrice": 3100,
    "minPrice": 2800,
    "maxPrice": 3800
  },
  "demandScore": 75,
  "suggestion": "Снизьте цену на 8% для быстрой продажи"
}
```

---

### Apply Recommended Price

**POST** `/dynamicPrice/apply/:adId`

**Request Body:**
```json
{
  "newPrice": 3200
}
```

---

### Market Analytics

**GET** `/dynamicPrice/analytics/market`

---

## Media & Uploads

### Get Pre-signed Upload URL

**POST** `/uploads/presigned-url`

**Request Body:**
```json
{
  "filename": "photo.jpg",
  "contentType": "image/jpeg",
  "size": 1024000
}
```

**Response:**
```json
{
  "uploadUrl": "https://storage.googleapis.com/...",
  "fileId": "abc123",
  "publicUrl": "https://storage.../abc123.webp"
}
```

---

### Complete Upload

**POST** `/uploads/:fileId/complete`

Confirm upload completion (triggers optimization).

---

### Media Proxy

**GET** `/media/proxy`

Proxy and optimize external images.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | string | Original image URL |
| `w` | number | Target width |
| `q` | number | Quality (1-100) |
| `f` | string | Format (`webp`, `jpeg`) |

---

### Upload Limits

**GET** `/uploads/limits`

**Response:**
```json
{
  "maxFileSize": 10485760,
  "maxPhotos": 10,
  "allowedTypes": ["image/jpeg", "image/png", "image/webp"]
}
```

---

## Admin Endpoints

### Fraud Dashboard

**GET** `/admin/rating/fraud/overview`

**Response:**
```json
{
  "totalSuspiciousAds": 15,
  "totalSuspiciousSellers": 5,
  "recentFraudReports": 8,
  "autoHiddenAds": 3,
  "trends": {
    "thisWeek": 12,
    "lastWeek": 8
  }
}
```

---

### Suspicious Ads

**GET** `/admin/rating/fraud/suspicious-ads`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max results |
| `offset` | number | Pagination |

---

### Suspicious Sellers

**GET** `/admin/rating/fraud/suspicious-sellers`

---

### Clear Ad Flags

**POST** `/admin/rating/fraud/ads/:adId/clear-flags`

---

### Mark Ad Suspicious

**POST** `/admin/rating/fraud/ads/:adId/mark-suspicious`

**Request Body:**
```json
{
  "reason": "Manual review - suspicious activity"
}
```

---

### Moderation Queue

**GET** `/moderation/pending`

Get ads pending moderation.

---

### Approve Ad

**POST** `/moderation/approve`

**Request Body:**
```json
{
  "adId": "507f1f77bcf86cd799439011"
}
```

---

### Reject Ad

**POST** `/moderation/reject`

**Request Body:**
```json
{
  "adId": "507f1f77bcf86cd799439011",
  "reason": "Нарушение правил размещения"
}
```

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "error_code",
  "message": "Human-readable error message"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `unauthorized` | 401 | Missing or invalid token |
| `forbidden` | 403 | Insufficient permissions |
| `not_found` | 404 | Resource not found |
| `validation_error` | 400 | Invalid request data |
| `too_many_requests` | 429 | Rate limit exceeded |
| `server_error` | 500 | Internal server error |

---

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Authentication | 10 req/min |
| Read operations | 100 req/min |
| Write operations | 30 req/min |
| File uploads | 10 req/min |
| AI endpoints | 20 req/min |

---

## Webhooks

### Telegram Bot Webhook

**POST** `/telegram-webhook`

Receives updates from Telegram Bot API.

---

## WebSocket

### Chat WebSocket

**WS** `/ws/chat`

Real-time chat updates.

**Message Format:**
```json
{
  "type": "message",
  "conversationId": "...",
  "message": {
    "text": "Hello!",
    "senderId": 123456789,
    "createdAt": "2024-01-15T12:00:00Z"
  }
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://your-domain.com/api',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get ads
const { data } = await api.get('/ads', {
  params: { lat: 53.9, lng: 27.5, radiusKm: 10 }
});

// Create ad
const response = await api.post('/ads', {
  title: 'iPhone 15',
  price: 3500,
  categoryId: 'phones'
});
```

### cURL

```bash
# Get ads
curl "https://your-domain.com/api/ads?limit=10&categoryId=phones" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create ad
curl -X POST "https://your-domain.com/api/ads" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "iPhone 15", "price": 3500, "categoryId": "phones"}'
```

---

**Last Updated:** November 2024
