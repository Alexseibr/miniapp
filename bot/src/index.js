import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = process.env.BACKEND_API_URL || 'http://localhost:5000';
const WEBAPP_URL =
  process.env.MINIAPP_BASE_URL || process.env.WEBAPP_URL || 'http://localhost:3000';

if (!BOT_TOKEN) {
  console.warn('[bot] TELEGRAM_BOT_TOKEN is not set — bot will not start.');
} else {
  const bot = new Telegraf(BOT_TOKEN);

  bot.start((ctx) => {
    ctx.reply('Добро пожаловать в фермерский маркетплейс! ', {
      reply_markup: {
        keyboard: [[{ text: 'Открыть миниапп', web_app: { url: WEBAPP_URL } }]],
        resize_keyboard: true,
      },
    });
  });

  bot.command('ping', async (ctx) => {
    ctx.reply('Проверяем API...');
    try {
      const response = await fetch(`${API_URL}/api/health`);
      const payload = await response.json();
      ctx.reply(`API ответило: ${JSON.stringify(payload)}`);
    } catch (error) {
      ctx.reply(`Не удалось связаться с API: ${error.message}`);
    }
  });

  bot.launch();
  console.log('[bot] Bot launched. Use /start to open the marketplace webapp.');
}

// Enable graceful stop for local dev and deployment.
process.once('SIGINT', () => process.exit(0));
process.once('SIGTERM', () => process.exit(0));
