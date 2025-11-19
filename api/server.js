const express = require('express');
const adsSearchRoutes = require('./routes/search.js');
const adsRoutes = require('./routes/ads.js');
const categoriesRoutes = require('./routes/categories.js');
const seasonsRoutes = require('./routes/seasons.js');
const ordersRoutes = require('./routes/orders.js');
const favoritesRoutes = require('./routes/favorites.js');
const alertsRoutes = require('./routes/alerts.js');
const moderationRoutes = require('./routes/moderation.js');
const authRoutes = require('./routes/auth.js');
const internalNotificationsRoutes = require('./routes/internalNotifications.js');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Базовые маршруты
app.get('/', (_req, res) => {
  res.json({
    message: 'API работает...',
    endpoints: {
      categories: '/api/categories',
      seasons: '/api/seasons',
      ads: '/api/ads',
      orders: '/api/orders',
      favorites: '/api/favorites',
      alerts: '/api/alerts',
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
app.use('/api/ads', adsSearchRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/seasons', seasonsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/mod', moderationRoutes);
app.use('/api/internal', internalNotificationsRoutes);
app.use('/auth', authRoutes);

// 404 обработчик
app.use((_req, res) => {
  res.status(404).json({ message: 'Маршрут не найден' });
});

// Обработчик ошибок
app.use((err, _req, res, _next) => {
  console.error('❌ Ошибка API:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Внутренняя ошибка сервера',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;
