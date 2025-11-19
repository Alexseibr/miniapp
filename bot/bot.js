const { Telegraf, Markup, session } = require('telegraf');
const config = require('../config/config.js');

const bot = new Telegraf(config.botToken);

bot.use(session());

// API базовый URL (для запросов к нашему Express API)
const API_URL = config.apiBaseUrl;

// Хелпер для получения активных сезонов
async function getActiveSeason() {
  try {
    const response = await fetch(`${API_URL}/api/seasons/active`);
    if (response.ok) {
      const seasons = await response.json();
      return seasons.length > 0 ? seasons[0] : null;
    }
  } catch (error) {
    console.error('Ошибка получения активного сезона:', error);
  }
  return null;
}

// === КОМАНДЫ ===

// /start - приветствие
bot.command('start', async (ctx) => {
  const firstName = ctx.from.first_name || 'друг';
  
  const activeSeason = await getActiveSeason();
  const seasonText = activeSeason 
    ? `\n\n🌟 Сейчас активна: **${activeSeason.name}**!`
    : '';
  
  await ctx.reply(
    `👋 Привет, ${firstName}!\n\n` +
    `Добро пожаловать в **KETMAR Market**! 🛍️${seasonText}\n\n` +
    `Доступные команды:\n` +
    `/catalog - 📦 Каталог объявлений\n` +
    `/season - 🌟 Сезонные предложения\n` +
    `/categories - 📂 Категории товаров\n` +
    `/search <запрос> - 🔍 Поиск объявлений\n` +
    `/myorders - 📋 Мои заказы\n` +
    `/myid - 🆔 Узнать свой Telegram ID\n` +
    `/new_test_ad - ➕ Создать тестовое объявление`,
    { parse_mode: 'Markdown' }
  );
});

// /myid - показать Telegram ID
bot.command('myid', async (ctx) => {
  const user = ctx.from;
  await ctx.reply(
    `👤 **Ваши данные:**\n\n` +
    `🆔 Telegram ID: \`${user.id}\`\n` +
    `👤 Username: ${user.username ? '@' + user.username : 'не указан'}\n` +
    `📝 Имя: ${user.first_name || ''} ${user.last_name || ''}`,
    { parse_mode: 'Markdown' }
  );
});

// /categories - показать категории (дерево)
bot.command('categories', async (ctx) => {
  try {
    const response = await fetch(`${API_URL}/api/categories`);
    
    if (!response.ok) {
      throw new Error('Ошибка получения категорий');
    }
    
    const categories = await response.json();
    
    if (categories.length === 0) {
      return ctx.reply('📂 Категории пока не добавлены.\n\nВыполните `npm run seed` для заполнения базы данных.');
    }
    
    let message = '📂 **Доступные категории:**\n\n';
    
    categories.forEach((cat) => {
      message += `📁 **${cat.name}** (${cat.slug})\n`;
      if (cat.subcategories && cat.subcategories.length > 0) {
        cat.subcategories.forEach((sub) => {
          message += `   └─ ${sub.name} (${sub.slug})\n`;
        });
      }
      message += '\n';
    });
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Ошибка в /categories:', error);
    await ctx.reply('❌ Произошла ошибка при загрузке категорий.');
  }
});

// /season - показать сезонные предложения
bot.command('season', async (ctx) => {
  try {
    const activeSeason = await getActiveSeason();
    
    if (!activeSeason) {
      return ctx.reply('🌟 Сейчас нет активных сезонов.\n\nСледите за обновлениями!');
    }
    
    const response = await fetch(`${API_URL}/api/ads?seasonCode=${activeSeason.code}&limit=10`);
    
    if (!response.ok) {
      throw new Error('Ошибка получения сезонных объявлений');
    }
    
    const data = await response.json();
    const ads = data.items || [];
    
    if (ads.length === 0) {
      return ctx.reply(
        `🌟 **${activeSeason.name}**\n\n` +
        `${activeSeason.description}\n\n` +
        `📦 Пока нет объявлений в этом сезоне.`,
        { parse_mode: 'Markdown' }
      );
    }
    
    await ctx.reply(
      `🌟 **${activeSeason.name}**\n\n` +
      `${activeSeason.description}\n\n` +
      `📦 Найдено предложений: ${ads.length}`,
      { parse_mode: 'Markdown' }
    );
    
    // Показываем сезонные объявления
    for (const ad of ads.slice(0, 5)) {
      const message = 
        `**${ad.title}**\n\n` +
        `${ad.description || 'Без описания'}\n\n` +
        `💰 Цена: **${ad.price} ${ad.currency}**\n` +
        `📂 Категория: ${ad.categoryId} - ${ad.subcategoryId}\n` +
        `👤 Продавец: ID ${ad.sellerTelegramId}`;
      
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🛒 Заказать', `order_${ad._id}`)],
        [Markup.button.callback('👁️ Подробнее', `view_${ad._id}`)],
      ]);
      
      if (ad.photos && ad.photos.length > 0) {
        await ctx.replyWithPhoto(ad.photos[0], {
          caption: message,
          parse_mode: 'Markdown',
          ...keyboard,
        });
      } else {
        await ctx.reply(message, {
          parse_mode: 'Markdown',
          ...keyboard,
        });
      }
    }
  } catch (error) {
    console.error('Ошибка в /season:', error);
    await ctx.reply('❌ Произошла ошибка при загрузке сезонных предложений.');
  }
});

// /catalog - показать каталог объявлений
bot.command('catalog', async (ctx) => {
  try {
    const response = await fetch(`${API_URL}/api/ads?limit=10`);
    
    if (!response.ok) {
      throw new Error('Ошибка получения объявлений');
    }
    
    const data = await response.json();
    const ads = data.items || [];
    
    if (ads.length === 0) {
      return ctx.reply('📦 Каталог пока пуст.\n\nСоздайте объявление командой /new_test_ad');
    }
    
    // Проверяем активный сезон
    const activeSeason = await getActiveSeason();
    const seasonHint = activeSeason 
      ? `\n\n🌟 Сезонные предложения: /season`
      : '';
    
    await ctx.reply(
      `📦 **Каталог объявлений** (${ads.length})${seasonHint}\n\nПросматривайте объявления:`, 
      { parse_mode: 'Markdown' }
    );
    
    // Показываем объявления по одному
    for (const ad of ads.slice(0, 5)) {
      const seasonBadge = ad.seasonCode ? ' 🌟' : '';
      const message = 
        `**${ad.title}**${seasonBadge}\n\n` +
        `${ad.description || 'Без описания'}\n\n` +
        `💰 Цена: **${ad.price} ${ad.currency}**\n` +
        `📂 Категория: ${ad.categoryId} - ${ad.subcategoryId}\n` +
        `👤 Продавец: ID ${ad.sellerTelegramId}\n` +
        `📊 Статус: ${ad.status}`;
      
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🛒 Заказать', `order_${ad._id}`)],
        [Markup.button.callback('👁️ Подробнее', `view_${ad._id}`)],
      ]);
      
      if (ad.photos && ad.photos.length > 0) {
        await ctx.replyWithPhoto(ad.photos[0], {
          caption: message,
          parse_mode: 'Markdown',
          ...keyboard,
        });
      } else {
        await ctx.reply(message, {
          parse_mode: 'Markdown',
          ...keyboard,
        });
      }
    }
    
    if (ads.length > 5) {
      await ctx.reply(`Показано 5 из ${ads.length} объявлений`);
    }
  } catch (error) {
    console.error('Ошибка в /catalog:', error);
    await ctx.reply('❌ Произошла ошибка при загрузке каталога.');
  }
});

// /search - поиск объявлений
bot.command('search', async (ctx) => {
  const query = ctx.message.text.split(' ').slice(1).join(' ');
  
  if (!query) {
    return ctx.reply('🔍 Использование: /search <запрос>\n\nПример: /search торт');
  }
  
  try {
    // Поиск по заголовку и описанию
    const response = await fetch(`${API_URL}/api/ads?limit=50`);
    
    if (!response.ok) {
      throw new Error('Ошибка поиска');
    }
    
    const data = await response.json();
    const allAds = data.items || [];
    
    // Фильтрация на стороне бота (в будущем можно добавить в API)
    const queryLower = query.toLowerCase();
    const results = allAds.filter(ad => 
      ad.title.toLowerCase().includes(queryLower) ||
      (ad.description && ad.description.toLowerCase().includes(queryLower)) ||
      ad.categoryId.toLowerCase().includes(queryLower) ||
      ad.subcategoryId.toLowerCase().includes(queryLower)
    );
    
    if (results.length === 0) {
      return ctx.reply(`🔍 По запросу "${query}" ничего не найдено.`);
    }
    
    await ctx.reply(`🔍 **Результаты поиска "${query}":**\n\nНайдено: ${results.length}`, {
      parse_mode: 'Markdown',
    });
    
    for (const ad of results.slice(0, 5)) {
      const seasonBadge = ad.seasonCode ? ' 🌟' : '';
      const message = 
        `**${ad.title}**${seasonBadge}\n` +
        `💰 ${ad.price} ${ad.currency}\n` +
        `📂 ${ad.categoryId} - ${ad.subcategoryId}`;
      
      if (ad.photos && ad.photos.length > 0) {
        await ctx.replyWithPhoto(ad.photos[0], {
          caption: message,
          parse_mode: 'Markdown',
        });
      } else {
        await ctx.reply(message, { parse_mode: 'Markdown' });
      }
    }
  } catch (error) {
    console.error('Ошибка в /search:', error);
    await ctx.reply('❌ Произошла ошибка при поиске.');
  }
});

// /myorders - мои заказы
bot.command('myorders', async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const response = await fetch(`${API_URL}/api/orders/${telegramId}`);
    
    if (!response.ok) {
      throw new Error('Ошибка получения заказов');
    }
    
    const orders = await response.json();
    
    if (orders.length === 0) {
      return ctx.reply('📋 У вас пока нет заказов.');
    }
    
    await ctx.reply(`📋 **Ваши заказы** (${orders.length}):`, { parse_mode: 'Markdown' });
    
    for (const order of orders) {
      const statusEmoji = {
        pending: '⏳',
        confirmed: '✅',
        processing: '🔄',
        completed: '🎉',
        cancelled: '❌',
      };
      
      const itemsList = order.items
        .map((item) => `  • ${item.title} × ${item.quantity} = ${item.price * item.quantity} ${item.currency || 'BYN'}`)
        .join('\n');
      
      const totalPrice = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const message = 
        `**Заказ #${order._id.slice(-6)}**\n\n` +
        `${itemsList}\n\n` +
        `💰 Итого: **${totalPrice} BYN**\n` +
        `📊 Статус: ${statusEmoji[order.status] || '❓'} ${order.status}\n` +
        `📅 Дата: ${new Date(order.createdAt).toLocaleDateString('ru-RU')}` +
        (order.comment ? `\n💬 Комментарий: ${order.comment}` : '');
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Ошибка в /myorders:', error);
    await ctx.reply('❌ Произошла ошибка при загрузке заказов.');
  }
});

// /new_test_ad - создать тестовое объявление
bot.command('new_test_ad', async (ctx) => {
  try {
    const user = ctx.from;
    
    // Получаем активный сезон
    const activeSeason = await getActiveSeason();
    
    const testAd = {
      title: `Тестовое объявление от ${user.first_name || 'пользователя'}`,
      description: 'Это тестовое объявление, созданное через Telegram бота',
      categoryId: 'farm',
      subcategoryId: 'berries',
      price: 299,
      currency: 'BYN',
      sellerTelegramId: user.id,
      photos: [],
      deliveryOptions: ['pickup', 'delivery'],
      attributes: {
        condition: 'new',
        location: 'Минск',
      },
      seasonCode: activeSeason ? activeSeason.code : null,
    };
    
    const response = await fetch(`${API_URL}/api/ads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testAd),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка создания объявления');
    }
    
    const createdAd = await response.json();
    
    const seasonBadge = createdAd.seasonCode ? ` 🌟\n🌟 Сезон: ${createdAd.seasonCode}` : '';
    const message = 
      `✅ **Объявление создано!**\n\n` +
      `📝 **${createdAd.title}**${seasonBadge}\n` +
      `📂 Категория: ${createdAd.categoryId} - ${createdAd.subcategoryId}\n` +
      `💰 Цена: **${createdAd.price} ${createdAd.currency}**\n` +
      `🆔 ID: \`${createdAd._id}\`\n` +
      `👤 Продавец: ${user.id}`;
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Ошибка в /new_test_ad:', error);
    await ctx.reply(
      `❌ Ошибка при создании объявления:\n${error.message}\n\n` +
      `💡 Убедитесь, что категории заполнены командой \`npm run seed\``,
      { parse_mode: 'Markdown' }
    );
  }
});

// Обработка callback кнопок
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  
  if (data.startsWith('order_')) {
    await ctx.answerCbQuery('🛒 Функция оформления заказа в разработке');
  } else if (data.startsWith('view_')) {
    await ctx.answerCbQuery('👁️ Просмотр деталей...');
  } else {
    await ctx.answerCbQuery();
  }
});

// Обработка ошибок
bot.catch((err, ctx) => {
  console.error('❌ Ошибка в боте:', err);
  ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
});

module.exports = bot;
