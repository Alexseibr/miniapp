import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import connectDB from './config/db';
import usersRouter from './routes/users';
import adsRouter from './routes/ads';
import favoritesRouter from './routes/favorites';
import geoRouter from './routes/geo';
import seasonsRouter from './routes/seasons';
import uploadsRouter from './routes/uploads';
import adminRouter from './routes/admin';

dotenv.config();

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Telegram-InitData');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  return next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

app.use('/api/users', usersRouter);
app.use('/api/ads', adsRouter);
app.use('/api/geo', geoRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/seasons', seasonsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/admin', adminRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const port = Number(process.env.PORT) || 4000;

connectDB()
  .then(() => {
    app.listen(port, '0.0.0.0', () => {
      // eslint-disable-next-line no-console
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

export default app;
