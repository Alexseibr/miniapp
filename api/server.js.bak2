import express from 'express';
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
import { telegramAuthMiddleware } from '../middleware/telegramAuth.js';
import userRoutes from '../routes/userRoutes.js';
import miniAppFavoriteRoutes from '../routes/favoriteRoutes.js';
import miniAppOrderRoutes from '../routes/orderRoutes.js';

const app = express();

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
      auth: '/auth/telegram',
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
app.use('/auth', authRoutes);

export default app;
