import express from 'express';
import cors from 'cors';
import adsRouter from './routes/ads.js';
import categoriesRouter from './routes/categories.js';
import seasonsRouter from './routes/seasons.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.send('API работает. KETMAR Market backend запущен.');
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/ads', adsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/seasons', seasonsRouter);

  app.use((err, _req, res, _next) => {
    console.error('[app] Unexpected error', err);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  });

  return app;
}
