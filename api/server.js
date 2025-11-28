import express from 'express';
import compression from 'compression';
import { logErrors, notFoundHandler, errorHandler } from './middleware/errorHandlers.js';
import adsSearchRoutes from './routes/search.js';
import adsRoutes from './routes/ads.js';
import categoriesRoutes from './routes/categories.js';
import seasonsRoutes from './routes/seasons.js';
import ordersRoutes from './routes/orders.js';
import alertsRoutes from './routes/alerts.js';
import notificationsRoutes from './routes/notifications.js';
import moderationRoutes from './routes/moderation.js';
import authRoutes from './routes/auth.js';
import subscriptionsRoutes from './routes/subscriptions.js';
import adminRoutes from './routes/admin.js';
import adminAuthRoutes from './routes/adminAuth.js';
import { telegramAuthMiddleware } from '../middleware/telegramAuth.js';
import { adminAuth } from '../middleware/adminAuth.js';
import userRoutes from '../routes/userRoutes.js';
import miniAppFavoriteRoutes from '../routes/favoriteRoutes.js';
import miniAppOrderRoutes from '../routes/orderRoutes.js';
import layoutRoutes from './routes/layout.js';
import contentRoutes from './routes/content.js';
import phoneAuthRoutes from './routes/phoneAuth.js';
import chatRoutes from './routes/chat.js';
import uploadsRoutes from './routes/uploads.js';
import mediaRoutes from './routes/media.js';
import geoRoutes from './routes/geo.js';
import pricingRoutes from './routes/pricing.js';
import farmerRoutes from './routes/farmer.js';
import farmerSubscriptionsRoutes from './routes/farmer-subscriptions.js';
import globalSearchRoutes from './routes/globalSearch.js';
import trendsRoutes from './routes/trends.js';
import aiRoutes from './routes/ai.js';
import recommendationsRoutes from './routes/recommendations.js';
import geoIntelligenceRoutes from './routes/geoIntelligence.js';
import sellerProfileRoutes from './routes/seller-profile.js';
import sellerSubscriptionsRoutes from './routes/seller-subscriptions.js';
import sellerReviewsRoutes from './routes/seller-reviews.js';
import sellerAnalyticsRoutes from './routes/seller-analytics.js';
import twinRoutes from './routes/twin.js';
import dynamicPriceRoutes from './routes/dynamicPrice.js';
import sellerTwinRoutes from './routes/sellerTwin.js';
import queuesRoutes from './routes/queues.js';
import feedRoutes from './routes/feed.js';
import autoCategorizationRoutes from './routes/autoCategorization.js';
import storeProAnalyticsRoutes from './routes/store-pro-analytics.js';
import campaignAnalyticsRoutes from './routes/campaign-analytics.js';
import ratingRoutes from './routes/rating.js';
import adminRatingRoutes from './routes/admin-rating.js';
import devicesRoutes from './routes/devices.js';
import shopOrdersRoutes from './routes/shop-orders.js';
import shopAnalyticsRoutes from './routes/shop-analytics.js';
import farmerOrdersRoutes from './routes/farmer-orders.js';

const app = express();

// Compression middleware (gzip)
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024,
  level: 6,
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Базовые маршруты
app.get('/api', (_req, res) => {
  res.json({
    message: 'KETMAR API',
    version: '1.0.0',
    endpoints: {
      categories: '/api/categories',
      seasons: '/api/seasons',
      ads: '/api/ads',
      orders: '/api/orders',
      favorites: '/api/favorites',
      alerts: '/api/alerts',
      notifications: '/api/notifications',
      moderation: '/api/mod',
      admin: '/api/admin/*',
      auth: '/auth/telegram',
      phoneAuth: '/api/auth/sms/*',
      chat: '/api/chat/*',
      layout: '/api/layout',
      content: '/api/content',
      health: '/health',
    },
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// API маршруты
app.use('/api/users', userRoutes);
app.use('/api/favorites', miniAppFavoriteRoutes);
app.use('/api/orders', miniAppOrderRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/ads', adsSearchRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/seasons', seasonsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/orders', telegramAuthMiddleware, ordersRoutes);
app.use('/api/mod', telegramAuthMiddleware, moderationRoutes);
// Public admin auth endpoints (NOT protected by adminAuth)
app.use('/api/admin/auth', adminAuthRoutes);
// Protected admin endpoints
app.use('/api/admin', adminAuth, adminRoutes);
app.use('/api/layout', layoutRoutes);
app.use('/api/content', contentRoutes);
app.use('/auth', authRoutes);
app.use('/api/auth', phoneAuthRoutes);
app.use('/api/shop/orders', shopOrdersRoutes);
app.use('/api/shop/analytics', shopAnalyticsRoutes);
app.use('/api/farmer/orders', farmerOrdersRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/farmer', farmerRoutes);
app.use('/api/farmer/subscriptions', farmerSubscriptionsRoutes);
app.use('/api/search', globalSearchRoutes);
app.use('/api/trends', trendsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/geo-intelligence', geoIntelligenceRoutes);
app.use('/api/seller-profile', sellerProfileRoutes);
app.use('/api/seller/subscribe', sellerSubscriptionsRoutes);
app.use('/api/seller', sellerReviewsRoutes);
app.use('/api/seller-analytics', sellerAnalyticsRoutes);
app.use('/api/twin', twinRoutes);
app.use('/api/dynamic-price', dynamicPriceRoutes);
app.use('/api/seller-twin', sellerTwinRoutes);
app.use('/api/queues', queuesRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/auto-categorize', autoCategorizationRoutes);
app.use('/api/store/pro-analytics', storeProAnalyticsRoutes);
app.use('/api/campaign-analytics', campaignAnalyticsRoutes);
app.use('/api/campaigns', campaignAnalyticsRoutes);
app.use('/api/rating', ratingRoutes);
app.use('/api/admin/rating', adminAuth, adminRatingRoutes);
app.use('/api/devices', devicesRoutes);

export default app;
