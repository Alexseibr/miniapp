const { Telegraf, Markup, session } = require('telegraf');
const config = require('../config/config.js');
const axios = require('axios');

const bot = new Telegraf(config.botToken);

bot.use(session());

// API базовый URL (для запросов к нашему Express API)
const API_URL = config.apiBaseUrl;

async function fetchAdDetails(adId) {
  const response = await fetch(`${API_URL}/api/ads/${adId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Не удалось загрузить объявление');
  }

  return response.json();
}

function formatAdDetails(ad) {
  const seasonBadge = ad.seasonCode ? `\n🌟 Сезон: ${ad.seasonCode}` : '';
  const attributes = ad.attributes && typeof ad.attributes === 'object'
    ? Object.entries(ad.attributes)
        .filter(([_, value]) => Boolean(value))
        .map(([key, value]) => `• ${key}: ${value}`)
    : [];

  const attributesBlock = attributes.length
    ? `\n\n🔎 Характеристики:\n${attributes.join('\n')}`
    : '';

  const delivery = ad.deliveryOptions && ad.deliveryOptions.length
    ? `\n🚚 Доставка: ${ad.deliveryOptions.join(', ')}`
    : '';

  return (
    `**${ad.title}**\n\n` +
    `${ad.description || 'Без описания'}\n\n` +
    `💰 Цена: **${ad.price} ${ad.currency || 'BYN'}**\n` +
    `📂 Категория: ${ad.categoryId} — ${ad.subcategoryId}\n` +
    `👤 Продавец ID: ${ad.sellerTelegramId}` +
    seasonBadge +
    delivery +
    attributesBlock
  );
}

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
    `/sell - 🏪 Создать объявление\n` +
    `/my_ads - 📋 Мои объявления\n` +
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

// /sell — мастер создания объявления: выбор категории, подкатегории, затем поля
bot.command("sell", async (ctx) => {
  try {
    const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";

    // забираем дерево категорий
    const res = await axios.get(`${API_BASE_URL}/api/categories`);
    const categories = res.data || [];

    // фильтруем только корневые категории (parentSlug == null)
    const rootCats = categories.filter((c) => !c.parentSlug);

    if (!rootCats.length) {
      return ctx.reply("Категории пока не настроены. Обратитесь к администратору.");
    }

    // инициализируем сессию, если её нет
    if (!ctx.session) {
      ctx.session = {};
    }

    // сохраняем в сессию, что мы в режиме создания объявления
    ctx.session.sell = {
      step: "choose_category",
      data: {},
    };

    // собираем inline-клавиатуру по корневым категориям
    const keyboard = rootCats.map((cat) => [
      {
        text: cat.name,
        callback_data: `sell_cat:${cat.slug}`,
      },
    ]);

    await ctx.reply(
      "🧩 Шаг 1/5 — выбери категорию:",
      {
        reply_markup: {
          inline_keyboard: keyboard,
        },
      }
    );
  } catch (err) {
    console.error("/sell error:", err.response?.data || err.message);
    ctx.reply("⚠️ Ошибка при подготовке категорий. Попробуй позже.");
  }
});

// /my_ads - показать мои объявления
bot.command("my_ads", async (ctx) => {
  try {
    const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
    const telegramId = ctx.from.id;

    // получаем объявления пользователя
    const res = await axios.get(`${API_BASE_URL}/api/ads`, {
      params: { sellerTelegramId: telegramId, limit: 20 },
    });

    const ads = res.data.items || [];

    if (!ads.length) {
      return ctx.reply(
        "📭 У тебя пока нет объявлений.\n\n" +
        "Создай своё первое объявление командой /sell"
      );
    }

    const adsList = ads
      .map((ad, index) => {
        const statusEmoji = {
          active: "✅",
          draft: "📝",
          sold: "🔒",
          archived: "📦",
        };
        const emoji = statusEmoji[ad.status] || "❓";
        return (
          `${index + 1}. ${emoji} **${ad.title}**\n` +
          `   💰 ${ad.price} ${ad.currency || "BYN"}\n` +
          `   📂 ${ad.categoryId} / ${ad.subcategoryId}\n` +
          `   🆔 \`${ad._id}\``
        );
      })
      .join("\n\n");

    await ctx.reply(
      `📋 **Твои объявления** (${ads.length}):\n\n${adsList}\n\n` +
      `Создать новое: /sell`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("/my_ads error:", err.response?.data || err.message);
    ctx.reply("⚠️ Ошибка при загрузке объявлений. Попробуй позже.");
  }
});

// Обработка выбора категории (callback sell_cat:<slug>)
bot.action(/sell_cat:(.+)/, async (ctx) => {
  try {
    const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
    const slug = ctx.match[1];

    // убеждаемся, что мы в режиме sell
    if (!ctx.session || !ctx.session.sell) {
      return ctx.answerCbQuery("Диалог создания объявления не активен. Введи /sell.");
    }

    ctx.session.sell.data.categoryId = slug;

    // забираем дерево категорий
    const res = await axios.get(`${API_BASE_URL}/api/categories`);
    const categories = res.data || [];

    // находим выбранную корневую категорию
    const rootCat = categories.find((c) => c.slug === slug);
    if (!rootCat) {
      return ctx.answerCbQuery("Категория не найдена.");
    }

    const subcats = rootCat.subcategories || [];
    if (!subcats.length) {
      // если нет подкатегорий — сразу переходим к заголовку
      ctx.session.sell.data.subcategoryId = null;
      ctx.session.sell.step = "title";

      await ctx.editMessageText(
        `Категория: ${rootCat.name}\n\n` +
        "Шаг 2/5 — введи заголовок объявления (например: «Свежая малина»)."
      );
      return;
    }

    // есть подкатегории — показываем их
    ctx.session.sell.step = "choose_subcategory";

    const keyboard = subcats.map((sub) => [
      {
        text: sub.name,
        callback_data: `sell_subcat:${sub.slug}`,
      },
    ]);

    await ctx.editMessageText(
      `Категория: ${rootCat.name}\n\n` +
      "🧩 Шаг 2/5 — выбери подкатегорию:",
      {
        reply_markup: {
          inline_keyboard: keyboard,
        },
      }
    );
  } catch (err) {
    console.error("sell_cat error:", err.response?.data || err.message);
    ctx.reply("⚠️ Ошибка при обработке категории. Попробуй ещё раз /sell.");
  }
});

// Обработка выбора подкатегории (callback sell_subcat:<slug>)
bot.action(/sell_subcat:(.+)/, async (ctx) => {
  try {
    const slug = ctx.match[1];

    if (!ctx.session || !ctx.session.sell) {
      return ctx.answerCbQuery("Диалог создания объявления не активен. Введи /sell.");
    }

    ctx.session.sell.data.subcategoryId = slug;
    ctx.session.sell.step = "title";

    await ctx.editMessageText(
      "Категория и подкатегория выбраны.\n\n" +
      "📝 Шаг 3/5 — введи заголовок объявления.\n" +
      "Например: «Свежая малина»."
    );
  } catch (err) {
    console.error("sell_subcat error:", err.response?.data || err.message);
    ctx.reply("⚠️ Ошибка при обработке подкатегории. Попробуй ещё раз /sell.");
  }
});

// Обработка текстовых сообщений в процессе /sell и оформления заказа
bot.on("text", async (ctx) => {
  const text = ctx.message.text.trim();
  const normalized = text.toLowerCase();
  const hasSellFlow = Boolean(ctx.session?.sell);
  const hasOrderFlow = Boolean(ctx.session?.orderFlow);

  if (!hasSellFlow && !hasOrderFlow) {
    // нет активного мастера — игнорируем, пусть другие хендлеры сработают
    return;
  }

  const isCancelCommand = normalized === "/cancel" || normalized === "отмена";

  if (isCancelCommand) {
    const wasSell = Boolean(ctx.session?.sell);
    const wasOrder = Boolean(ctx.session?.orderFlow);
    ctx.session.sell = null;
    ctx.session.orderFlow = null;

    if (wasSell || wasOrder) {
      await ctx.reply("Диалог отменён. Можно начать заново в любое время.");
      return;
    }
  }

  // Позволяем другим командам Telegraf обрабатывать сообщения, кроме /cancel
  if (text.startsWith("/") && !isCancelCommand) {
    return;
  }

  if (hasSellFlow) {
    const sell = ctx.session.sell;

    // Шаг: заголовок
    if (sell.step === "title") {
      sell.data.title = text;
      sell.step = "description";

      await ctx.reply(
        "📝 Шаг 4/5 — введи описание объявления.\n" +
        "Например: «Домашняя малина, собираю каждое утро, без химии»."
      );
      return;
    }

    // Шаг: описание
    if (sell.step === "description") {
      sell.data.description = text;
      sell.step = "price";

      await ctx.reply(
        "💰 Шаг 5/5 — введи цену (только число).\n" +
        "Например: 10"
      );
      return;
    }

    // Шаг: цена
    if (sell.step === "price") {
      const priceNumber = Number(text.replace(",", "."));
      if (Number.isNaN(priceNumber) || priceNumber <= 0) {
        await ctx.reply("Цена должна быть положительным числом. Попробуй ещё раз, например: 10");
        return;
      }

      sell.data.price = priceNumber;

      // формируем payload
      const payload = {
        title: sell.data.title,
        description: sell.data.description,
        categoryId: sell.data.categoryId,
        subcategoryId: sell.data.subcategoryId,
        price: sell.data.price,
        currency: "BYN",
        attributes: {},
        photos: [],
        sellerTelegramId: ctx.from.id,
        deliveryType: "pickup_only",
        deliveryRadiusKm: null,
        location: null,
        seasonCode: null,
        lifetimeDays: 7,
      };

      try {
        const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
        const res = await axios.post(`${API_BASE_URL}/api/ads`, payload);
        const ad = res.data;

        // очищаем мастер
        ctx.session.sell = null;

        await ctx.reply(
          "✅ Объявление создано!\n\n" +
          `Заголовок: ${ad.title}\n` +
          `Цена: ${ad.price} ${ad.currency || "BYN"}\n\n` +
          "Посмотреть свои объявления: /my_ads"
        );
      } catch (err) {
        console.error("Ошибка при создании объявления через /sell:", err.response?.data || err.message);
        ctx.session.sell = null;
        await ctx.reply("⚠️ Произошла ошибка при создании объявления. Попробуй позже.");
      }

      return;
    }
  }

  if (hasOrderFlow) {
    const orderFlow = ctx.session.orderFlow;
    const API_BASE_URL = API_URL;

    if (orderFlow.step === "quantity") {
      const quantity = parseInt(text, 10);

      if (Number.isNaN(quantity) || quantity < 1 || quantity > 50) {
        await ctx.reply("Введите количество числом от 1 до 50. Например: 2");
        return;
      }

      orderFlow.quantity = quantity;
      orderFlow.step = "comment";

      await ctx.reply(
        "Добавь комментарий к заказу (например, способ связи) или отправь «-», если без комментария."
      );
      return;
    }

    if (orderFlow.step === "comment") {
      const comment = normalized === "-" || normalized === "нет" ? "" : text;

      const payload = {
        buyerTelegramId: ctx.from.id,
        buyerName: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") || undefined,
        buyerUsername: ctx.from.username || undefined,
        items: [
          {
            adId: orderFlow.ad.id,
            quantity: orderFlow.quantity,
          },
        ],
        comment: comment || undefined,
        seasonCode: orderFlow.ad.seasonCode || undefined,
      };

      try {
        await ctx.reply("⏳ Создаю заказ...");
        const response = await fetch(`${API_BASE_URL}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || "Не удалось создать заказ");
        }

        const order = await response.json();
        const item = order.items[0];
        const currency = item?.currency || "BYN";

        ctx.session.orderFlow = null;

        await ctx.reply(
          `🧾 Заказ оформлен!\n\n` +
            `Товар: ${item.title} × ${item.quantity}\n` +
            `Итого: ${order.totalPrice} ${currency}\n` +
            `Статус: ${order.status}\n\n` +
            `Отслеживать: /myorders`,
          { parse_mode: "Markdown" }
        );
      } catch (error) {
        console.error("Ошибка оформления заказа:", error);
        ctx.session.orderFlow = null;
        await ctx.reply(
          "⚠️ Не удалось оформить заказ. Попробуй позже или свяжись с продавцом напрямую."
        );
      }

      return;
    }
  }
});

// Обработка callback кнопок
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith('order_')) {
    const adId = data.replace('order_', '');

    if (ctx.session?.sell) {
      await ctx.answerCbQuery('Заверши создание объявления или отправь /cancel', { show_alert: true });
      return;
    }

    try {
      await ctx.answerCbQuery('🛒 Оформление заказа');
      const ad = await fetchAdDetails(adId);

      ctx.session.orderFlow = {
        step: 'quantity',
        ad: {
          id: ad._id,
          title: ad.title,
          price: ad.price,
          currency: ad.currency || 'BYN',
          seasonCode: ad.seasonCode || null,
        },
      };

      await ctx.reply(
        `🛒 Вы выбрали *${ad.title}* за ${ad.price} ${ad.currency || 'BYN'}.\n\n` +
          'Введите количество (1–50). Для отмены используйте /cancel.',
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Ошибка запуска оформления заказа:', error);
      await ctx.answerCbQuery('Не удалось начать оформление', { show_alert: true });
    }
  } else if (data.startsWith('view_')) {
    const adId = data.replace('view_', '');

    try {
      await ctx.answerCbQuery('Загружаю детали...');
      const ad = await fetchAdDetails(adId);
      const message = formatAdDetails(ad);
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🛒 Заказать', `order_${ad._id}`)],
      ]);

      if (ad.photos && ad.photos.length > 0) {
        await ctx.replyWithPhoto(ad.photos[0], {
          caption: message,
          parse_mode: 'Markdown',
          ...keyboard,
        });
      } else {
        await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
      }
    } catch (error) {
      console.error('Ошибка просмотра объявления:', error);
      await ctx.answerCbQuery('Не удалось показать объявление', { show_alert: true });
    }
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
