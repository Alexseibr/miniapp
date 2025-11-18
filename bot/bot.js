import { Telegraf, Markup } from 'telegraf';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN не найден в переменных окружения!');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// API базовый URL (для запросов к нашему Express API)
const API_URL = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

// === КОМАНДЫ ===

// /start - приветствие
bot.command('start', async (ctx) => {
  const firstName = ctx.from.first_name || 'друг';
  
  await ctx.reply(
    `👋 Привет, ${firstName}!\n\n` +
    `Добро пожаловать в **Telegram Marketplace**! 🛍️\n\n` +
    `Вот что я умею:\n` +
    `/catalog - 📦 Просмотр каталога товаров\n` +
    `/categories - 📂 Список категорий\n` +
    `/search <запрос> - 🔍 Поиск товаров\n` +
    `/myorders - 📋 Мои заказы\n` +
    `/help - ❓ Помощь`,
    { parse_mode: 'Markdown' }
  );
});

// /help - помощь
bot.command('help', async (ctx) => {
  await ctx.reply(
    `🆘 **Помощь по боту**\n\n` +
    `**Доступные команды:**\n` +
    `/start - Начать работу\n` +
    `/catalog - Открыть каталог товаров\n` +
    `/categories - Посмотреть все категории\n` +
    `/search <название> - Найти товары\n` +
    `/myorders - Посмотреть мои заказы\n` +
    `/myid - Узнать свой Telegram ID\n\n` +
    `По вопросам обращайтесь к администратору.`,
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

// /catalog - показать каталог товаров
bot.command('catalog', async (ctx) => {
  try {
    const response = await fetch(`${API_URL}/api/products?status=active&limit=10`);
    
    if (!response.ok) {
      throw new Error('Ошибка получения товаров');
    }
    
    const products = await response.json();
    
    if (products.length === 0) {
      return ctx.reply('📦 Каталог пока пуст. Скоро добавим товары!');
    }
    
    await ctx.reply(`📦 **Каталог товаров** (${products.length} товаров)\n\nВыберите товар для просмотра:`, {
      parse_mode: 'Markdown',
    });
    
    // Показываем товары по одному
    for (const product of products.slice(0, 5)) {
      const categoryName = product.categoryId?.name || 'Без категории';
      const message = 
        `**${product.name}**\n\n` +
        `${product.description}\n\n` +
        `💰 Цена: **${product.price} ₽**\n` +
        `📂 Категория: ${categoryName}\n` +
        `📦 В наличии: ${product.stock} шт.`;
      
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🛒 В корзину', `add_${product._id}`)],
        [Markup.button.callback('👁️ Подробнее', `view_${product._id}`)],
      ]);
      
      if (product.images && product.images.length > 0) {
        await ctx.replyWithPhoto(product.images[0], {
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
    console.error('Ошибка в /catalog:', error);
    await ctx.reply('❌ Произошла ошибка при загрузке каталога. Попробуйте позже.');
  }
});

// /categories - показать категории
bot.command('categories', async (ctx) => {
  try {
    const response = await fetch(`${API_URL}/api/categories`);
    
    if (!response.ok) {
      throw new Error('Ошибка получения категорий');
    }
    
    const categories = await response.json();
    
    if (categories.length === 0) {
      return ctx.reply('📂 Категории пока не добавлены.');
    }
    
    const categoriesList = categories
      .map((cat, index) => `${cat.icon} **${cat.name}**${cat.description ? '\n   _' + cat.description + '_' : ''}`)
      .join('\n\n');
    
    await ctx.reply(
      `📂 **Доступные категории:**\n\n${categoriesList}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Ошибка в /categories:', error);
    await ctx.reply('❌ Произошла ошибка при загрузке категорий.');
  }
});

// /search - поиск товаров
bot.command('search', async (ctx) => {
  const query = ctx.message.text.split(' ').slice(1).join(' ');
  
  if (!query) {
    return ctx.reply('🔍 Использование: /search <название товара>\n\nПример: /search телефон');
  }
  
  try {
    const response = await fetch(`${API_URL}/api/products/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    
    if (!response.ok) {
      throw new Error('Ошибка поиска');
    }
    
    const products = await response.json();
    
    if (products.length === 0) {
      return ctx.reply(`🔍 По запросу "${query}" ничего не найдено.`);
    }
    
    await ctx.reply(`🔍 **Результаты поиска "${query}":**\n\nНайдено товаров: ${products.length}`, {
      parse_mode: 'Markdown',
    });
    
    for (const product of products.slice(0, 5)) {
      const message = 
        `**${product.name}**\n` +
        `💰 ${product.price} ₽\n` +
        `📦 В наличии: ${product.stock} шт.`;
      
      if (product.images && product.images.length > 0) {
        await ctx.replyWithPhoto(product.images[0], {
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
    const telegramId = ctx.from.id.toString();
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
        completed: '🎉',
        cancelled: '❌',
      };
      
      const itemsList = order.items
        .map((item) => `  • ${item.productName || 'Товар'} × ${item.quantity} = ${item.price * item.quantity} ₽`)
        .join('\n');
      
      const message = 
        `**Заказ #${order._id.slice(-6)}**\n\n` +
        `${itemsList}\n\n` +
        `💰 Итого: **${order.total} ₽**\n` +
        `📊 Статус: ${statusEmoji[order.status] || '❓'} ${order.status}\n` +
        `📅 Дата: ${new Date(order.createdAt).toLocaleDateString('ru-RU')}`;
      
      await ctx.reply(message, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Ошибка в /myorders:', error);
    await ctx.reply('❌ Произошла ошибка при загрузке заказов.');
  }
});

// Обработка callback кнопок
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  
  if (data.startsWith('add_')) {
    await ctx.answerCbQuery('🛒 Товар добавлен в корзину!');
  } else if (data.startsWith('view_')) {
    await ctx.answerCbQuery('👁️ Открываем товар...');
  } else {
    await ctx.answerCbQuery();
  }
});

// Обработка ошибок
bot.catch((err, ctx) => {
  console.error('❌ Ошибка в боте:', err);
  ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
});

export default bot;
