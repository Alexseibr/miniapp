import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables early so that local development is predictable.
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// A simple health check keeps cloud runtimes alive and helps uptime monitors.
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'fermer-market-backend' });
});

// TODO: add real routes under /api once the domain model is migrated.
app.get('/api/example', (_req, res) => {
  res.json({ message: 'Replace this with marketplace endpoints.' });
});

app.listen(PORT, () => {
  // Keep the log concise; add more structured logging once the stack is chosen.
  console.log(`[backend] Server listening on port ${PORT}`);
});
