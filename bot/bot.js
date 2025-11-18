import { Telegraf } from 'telegraf';
import { BOT_TOKEN } from '../config/config.js';

export function startBot() {
  if (!BOT_TOKEN) {
    console.warn('[bot] BOT_TOKEN не задан, бот не будет запущен');
    return null;
  }

  const bot = new Telegraf(BOT_TOKEN);

  bot.start(async (ctx) => {
    await ctx.reply(
      'Привет! Я бот маркетплейса объявлений. Доступные команды:\n' +
        '/myid — показать ваш Telegram ID'
    );
  });

  bot.command('myid', async (ctx) => {
    const user = ctx.from;
    await ctx.reply(
      `ID: ${user.id}\nUsername: ${user.username || '—'}\nИмя: ${user.first_name || '—'}`
    );
  });

  bot.launch();
  console.log('[bot] Bot launched');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  return bot;
}
