import { createServer } from './api/server.js';
import { BOT_TOKEN, PORT } from './config/config.js';
import { startBot } from './bot/bot.js';
import { connectDB } from './services/db.js';

async function bootstrap() {
  await connectDB();

  const app = createServer();
  app.listen(PORT, () => {
    console.log(`[api] Listening on port ${PORT}`);
  });

  if (BOT_TOKEN) {
    startBot();
  } else {
    console.warn('[bot] BOT_TOKEN не указан, бот не запущен');
  }
}

bootstrap().catch((error) => {
  console.error('[bootstrap] Failed to start application', error);
  process.exit(1);
});
