const express = require('express');
const { logErrors, notFoundHandler, errorHandler } = require('./middleware/errorHandlers.js');
const adsSearchRoutes = require('./routes/search.js');
const adsRoutes = require('./routes/ads.js');
const categoriesRoutes = require('./routes/categories.js');
const seasonsRoutes = require('./routes/seasons.js');
const ordersRoutes = require('./routes/orders.js');
const favoritesRoutes = require('./routes/favorites.js');
const alertsRoutes = require('./routes/alerts.js');
const notificationsRoutes = require('./routes/notifications.js');
const moderationRoutes = require('./routes/moderation.js');
const authRoutes = require('./routes/auth.js');
const internalNotificationsRoutes = require('./routes/internalNotifications.js');
const pkg = require('../package.json');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Базовые маршруты
app.get('/', (_req, res) => {
  res.json({
    message: 'API работает...',
    endpoints: {
      apiIndex: '/api',
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

app.get('/api', (_req, res) => {
  res.json({
    message: 'KETMAR API',
    version: pkg.version || '1.0.0',
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
// Ads routes should be mounted before legacy search to ensure enhanced handlers run
app.use('/api/ads', adsRoutes);
app.use('/api/ads', adsSearchRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/seasons', seasonsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/mod', moderationRoutes);
app.use('/api/internal', internalNotificationsRoutes);
app.use('/auth', authRoutes);

// 404 обработчик
app.use(notFoundHandler);

// Логирование и финальный обработчик ошибок
app.use(logErrors);
app.use(errorHandler);

module.exports = app;
