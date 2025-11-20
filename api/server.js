const express = require('express');
const path = require('path');
const pkg = require('../package.json');
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
const phoneAuthRoutes = require('./routes/phoneAuth.js');
const telegramLoginRoutes = require('./routes/telegramLogin.js');
const { telegramAuthMiddleware } = require('../middleware/telegramAuth.js');
const userRoutes = require('../routes/userRoutes');
// Favorites for SPA
const miniAppOrderRoutes = require('../routes/orderRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const chatRoutes = require('./routes/chat');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Базовые маршруты
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
app.use('/api/users', userRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/orders', miniAppOrderRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/ads', adsSearchRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/seasons', seasonsRoutes);
app.use('/api/orders', telegramAuthMiddleware, ordersRoutes);
app.use('/api/mod', telegramAuthMiddleware, moderationRoutes);
app.use('/auth', authRoutes);
app.use('/api/auth', phoneAuthRoutes);
app.use('/api/auth/telegram', telegramLoginRoutes);

module.exports = app;
