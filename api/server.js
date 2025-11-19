const express = require('express');
const cors = require('cors');
const categoriesRouter = require('./routes/categories.js');
const seasonsRouter = require('./routes/seasons.js');
const adsRouter = require('./routes/ads.js');
const ordersRouter = require('./routes/orders.js');
const usersRouter = require('./routes/users.js');

function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.send('API работает. KETMAR Market backend запущен.');
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/categories', categoriesRouter);
  app.use('/api/seasons', seasonsRouter);
  app.use('/api/ads', adsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/users', usersRouter);

  app.use((err, _req, res, _next) => {
    console.error('[api] Unexpected error:', err);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  });

  return app;
}

module.exports = { createServer };
