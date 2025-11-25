import express from 'express';
import compression from 'compression';
import { logErrors, notFoundHandler, errorHandler } from './middleware/errorHandlers.js';
import adsSearchRoutes from './routes/search.js';
import adsRoutes from './routes/ads.js';
import categoriesRoutes from './routes/categories.js';
import seasonsRoutes from './routes/seasons.js';
import ordersRoutes from './routes/orders.js';
import favoritesRoutes from './routes/favorites.js';
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
app.use('/api/favorites', telegramAuthMiddleware, favoritesRoutes);
app.use('/api/mod', telegramAuthMiddleware, moderationRoutes);
// Public admin auth endpoints (NOT protected by adminAuth)
app.use('/api/admin/auth', adminAuthRoutes);
// Protected admin endpoints
app.use('/api/admin', adminAuth, adminRoutes);
app.use('/api/layout', layoutRoutes);
app.use('/api/content', contentRoutes);
app.use('/auth', authRoutes);
app.use('/api/auth', phoneAuthRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/geo', geoRoutes);

export default app;
