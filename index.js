const { createServer } = require('./api/server.js');
const { BOT_TOKEN, PORT } = require('./config/config.js');
const { startBot } = require('./bot/bot.js');
const { connectDB } = require('./services/db.js');

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
