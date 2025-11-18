import { Telegraf } from 'telegraf';
import Ad from '../models/Ad.js';

function formatAd(ad) {
  const price = ad.price ? `${ad.price} ₽` : 'Цена не указана';
  const tags = ad.tags?.length ? `\nТеги: ${ad.tags.join(', ')}` : '';
  return `📦 ${ad.title}\n${price}\n${ad.description || 'Описание отсутствует'}${tags}`;
}

export function createBot() {
  const { TELEGRAM_BOT_TOKEN } = process.env;

  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[bot] TELEGRAM_BOT_TOKEN не задан, бот не будет запущен');
    return null;
  }

  const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

  bot.start((ctx) => {
    ctx.reply(
      'Привет! Я бот маркетплейса объявлений. Используйте /latest, чтобы посмотреть новые объявления, или отправьте текст, чтобы я поискал по названию.'
    );
  });

  bot.command('latest', async (ctx) => {
    const ads = await Ad.find().sort({ createdAt: -1 }).limit(5);
    if (!ads.length) {
      return ctx.reply('Пока нет объявлений. Добавьте первое через MiniApp.');
    }

    const messages = ads.map(formatAd).join('\n\n');
    return ctx.reply(messages);
  });

  bot.on('text', async (ctx) => {
    const query = ctx.message.text.trim();
    if (query.length < 3) {
      return ctx.reply('Введите минимум 3 символа для поиска.');
    }

    const ads = await Ad.find({ title: { $regex: query, $options: 'i' } })
      .sort({ createdAt: -1 })
      .limit(5);

    if (!ads.length) {
      return ctx.reply('Ничего не нашёл. Попробуйте другую формулировку.');
    }

    const messages = ads.map(formatAd).join('\n\n');
    return ctx.reply(messages);
  });

  return bot;
}
