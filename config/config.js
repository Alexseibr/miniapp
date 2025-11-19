require('dotenv').config();

// Поддержка обоих вариантов переменных окружения
const config = {
  // MongoDB - поддержка MONGO_URL и MONGODB_URI
  mongoUrl: process.env.MONGO_URL || process.env.MONGODB_URI,

  // Telegram Bot - поддержка BOT_TOKEN и TELEGRAM_BOT_TOKEN
  botToken: process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN,

  // WebApp base URL (можно указать через MINIAPP_URL или TELEGRAM_MINIAPP_URL)
  miniAppUrl: process.env.MINIAPP_URL || process.env.TELEGRAM_MINIAPP_URL,

  // Порт API
  port: process.env.PORT || 3000,

  // Базовый URL API для бота
  apiBaseUrl: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  
  // Node environment
  nodeEnv: process.env.NODE_ENV || 'development',
};

// Валидация обязательных переменных
if (!config.mongoUrl) {
  console.error('❌ MONGO_URL или MONGODB_URI не найден в переменных окружения!');
  process.exit(1);
}

if (!config.botToken) {
  console.error('❌ BOT_TOKEN или TELEGRAM_BOT_TOKEN не найден в переменных окружения!');
  process.exit(1);
}

module.exports = config;
