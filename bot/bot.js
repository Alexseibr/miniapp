import axios from 'axios';
import { Telegraf } from 'telegraf';
import { API_BASE_URL, BOT_TOKEN } from '../config/config.js';

function formatCategories(categories) {
  const lines = ['📂 Категории:'];

  const walk = (nodes, indent = '') => {
    nodes.forEach((node, index) => {
      const prefix = indent ? '└─ ' : '• ';
      lines.push(`${indent}${prefix}${node.name} (${node.slug})`);
      const nextIndent = indent ? `${indent}   ` : '   ';
      if (node.subcategories?.length) {
        node.subcategories.forEach((child) => walk([child], nextIndent));
      }
    });
  };

  walk(categories);
  return lines.join('\n');
}

async function handleCategories(ctx) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/categories`);
    const text = formatCategories(response.data || []);
    await ctx.reply(text);
  } catch (error) {
    console.error('[bot] /categories error', error.message);
    await ctx.reply('Не удалось получить категории. Попробуйте позже.');
  }
}

async function handleNewTestAd(ctx) {
  const sellerTelegramId = ctx.from?.id;
  const payload = {
    title: 'Свежая малина (тест)',
    description: 'Тестовое объявление, созданное из бота.',
    categoryId: 'farm',
    subcategoryId: 'berries',
    price: 10,
    currency: 'BYN',
    attributes: { berryType: 'малина' },
    photos: [],
    sellerTelegramId,
    deliveryType: 'delivery_and_pickup',
    deliveryRadiusKm: 5,
    location: null,
    seasonCode: null,
    lifetimeDays: 7,
  };

  try {
    const response = await axios.post(`${API_BASE_URL}/api/ads`, payload);
    const ad = response.data;
    await ctx.reply(
      `Создано объявление:\nID: ${ad._id}\n${ad.title}\nЦена: ${ad.price} ${ad.currency}`
    );
  } catch (error) {
    console.error('[bot] /new_test_ad error', error.message);
    await ctx.reply('Не удалось создать тестовое объявление.');
  }
}

export function startBot() {
  if (!BOT_TOKEN) {
    console.warn('[bot] BOT_TOKEN не задан, бот не будет запущен');
    return null;
  }

  const bot = new Telegraf(BOT_TOKEN);

  bot.start(async (ctx) => {
    await ctx.reply(
      'Привет! Я бот маркетплейса объявлений. Доступные команды:\n' +
        '/myid — показать ваш Telegram ID\n' +
        '/categories — показать дерево категорий\n' +
        '/new_test_ad — создать тестовое объявление'
    );
  });

  bot.command('myid', async (ctx) => {
    const user = ctx.from;
    await ctx.reply(
      `ID: ${user.id}\nUsername: ${user.username || '—'}\nИмя: ${user.first_name || '—'}`
    );
  });

  bot.command('categories', handleCategories);
  bot.command('new_test_ad', handleNewTestAd);

  bot.launch();
  console.log('[bot] Bot launched');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  return bot;
}
