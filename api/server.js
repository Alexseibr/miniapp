import express from 'express';
import cors from 'cors';

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.send('API работает. KETMAR Market backend запущен.');
  });

  return app;
}
