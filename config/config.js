import 'dotenv/config';

const warn = (message) => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn(message);
  }
};

const port = process.env.PORT || 3000;
const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI;
const botToken = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const miniAppUrl = process.env.MINIAPP_URL || process.env.TELEGRAM_MINIAPP_URL;
const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${port}`;
const adminTelegramId = process.env.ADMIN_TELEGRAM_ID || process.env.TELEGRAM_ADMIN_ID || null;

if (!mongoUrl) {
  console.error('❌ MONGO_URL или MONGODB_URI не найден в переменных окружения!');
  process.exit(1);
}

if (!botToken) {
  console.error('❌ BOT_TOKEN или TELEGRAM_BOT_TOKEN не найден в переменных окружения!');
  process.exit(1);
}

if (!miniAppUrl) {
  warn('ℹ️ MINIAPP_URL не задан — кнопки WebApp будут вести на значение по умолчанию.');
}

export { mongoUrl, botToken, miniAppUrl, port, apiBaseUrl, adminTelegramId };
