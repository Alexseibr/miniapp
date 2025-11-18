import dotenv from 'dotenv';
import { connectToDatabase } from './config/db.js';
import { createApp } from './app.js';
import { createBot } from './bot/bot.js';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  await connectToDatabase();

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT}`);
  });

  const bot = createBot();
  if (bot) {
    bot.launch();
    console.log('[bot] Bot launched');

    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  }
}

bootstrap().catch((error) => {
  console.error('[bootstrap] Failed to start application', error);
  process.exit(1);
});
