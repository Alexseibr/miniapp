import express from 'express';
import cors from 'cors';
import adsRouter from './routes/ads.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/ads', adsRouter);

  app.use((err, _req, res, _next) => {
    console.error('[app] Unexpected error', err);
    res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  });

  return app;
}
