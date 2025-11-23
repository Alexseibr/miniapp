const { Telegraf, Markup, session } = require('telegraf');
const config = require('../config/config.js');
const axios = require('axios');
const registerSeasonHandlers = require('./seasonHandlers');

const bot = new Telegraf(config.botToken);

bot.use(session());

// API базовый URL (для запросов к нашему Express API)
const API_URL = config.apiBaseUrl;
const MINIAPP_URL = config.miniAppUrl || process.env.MINIAPP_URL;

async function getModeratorJWT(telegramId) {
  try {
    const response = await axios.post(
      `${API_URL}/api/mod/token`,
      { telegramId },
      {
        headers: {
          'Authorization': `Bearer ${config.botToken}`,
        },
      }
    );
    return response.data.token;
  } catch (error) {
    console.error('Не удалось получить JWT токен:', error.response?.data || error.message);
    return null;
  }
}

registerSeasonHandlers(bot, { apiUrl: API_URL });

async function sendFavoriteUpdateNotification(telegramId, payload = {}) {
  const normalizedId = Number(telegramId);

  if (!Number.isFinite(normalizedId)) {
    console.warn('Некорректный telegramId для уведомления избранного', telegramId);
    return;
  }

  const title = payload.title || 'Объявление';
  const lines = ['\ud83d\udd14 Обновление по избранному объявлению:', `Название: ${title}`];

  if (payload.oldPrice !== undefined || payload.newPrice !== undefined) {
    lines.push(`Цена: ${payload.oldPrice ?? '—'} → ${payload.newPrice ?? '—'}`);
  }

  if (payload.oldStatus || payload.newStatus) {
    lines.push(`Статус: ${payload.oldStatus || '—'} → ${payload.newStatus || '—'}`);
  }

  if (payload.adId) {
    const link = buildMiniAppUrl({ adId: payload.adId });
    if (link) {
      lines.push(`Открыть: ${link}`);
    }
  }

  try {
    await bot.telegram.sendMessage(normalizedId, lines.join('\n'), {
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error('Ошибка отправки уведомления избранного:', error);
  }
}

function escapeMarkdown(text = '') {
  if (typeof text !== 'string') {
    return '';
  }

  return text.replace(/([_*\[\]()~`>#+=|{}.!\\-])/g, '\\$1');
}

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

function truncateText(text, maxLength = 160) {
  if (!text) {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

async function finalizeAdCreation(ctx) {
  if (!ctx.session || !ctx.session.sell) {
    return ctx.reply("⚠️ Ошибка: диалог создания объявления не найден.");
  }

  const sell = ctx.session.sell;
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
    location: sell.data.location || null,
    seasonCode: null,
    lifetimeDays: 7,
  };

  try {
    const res = await axios.post(`${API_URL}/api/ads`, payload);
    const ad = res.data;

    ctx.session.sell = null;

    const locationInfo = ad.location 
      ? `\n📍 С геолокацией: ${ad.location.lat.toFixed(4)}, ${ad.location.lng.toFixed(4)}`
      : '';

    await ctx.reply(
      "✅ Объявление создано!\n\n" +
      `Заголовок: ${ad.title}\n` +
      `Цена: ${ad.price} ${ad.currency || "BYN"}${locationInfo}\n\n` +
      "Посмотреть свои объявления: /my_ads",
      {
        reply_markup: {
          remove_keyboard: true,
        },
      }
    );
  } catch (err) {
    console.error("Ошибка при создании объявления через /sell:", err.response?.data || err.message);
    ctx.session.sell = null;
    await ctx.reply("⚠️ Произошла ошибка при создании объявления. Попробуй позже.");
  }
}

const MARKET_PAGE_SIZE = 5;

function buildMiniAppUrl(params = {}) {
  if (!MINIAPP_URL) {
    return '';
  }

  const filteredParams = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');

  if (!filteredParams.length) {
    return MINIAPP_URL;
  }

  try {
    const url = new URL(MINIAPP_URL);
    filteredParams.forEach(([key, value]) => url.searchParams.set(key, value));
    return url.toString();
  } catch (error) {
    const query = new URLSearchParams(filteredParams).toString();
    const separator = MINIAPP_URL.includes('?') ? '&' : '?';
    return query ? `${MINIAPP_URL}${separator}${query}` : MINIAPP_URL;
  }
}

function getMiniAppKeyboard() {
  if (!MINIAPP_URL) {
    return undefined;
  }

  return {
    keyboard: [
      [{ text: 'Открыть KETMAR Market', web_app: { url: buildMiniAppUrl() } }],
      [{ text: 'Фермеры', web_app: { url: buildMiniAppUrl({ niche: 'farm' }) } }],
      [{ text: 'Ремесленники', web_app: { url: buildMiniAppUrl({ niche: 'craft' }) } }],
      [{ text: '8 марта — тюльпаны', web_app: { url: buildMiniAppUrl({ season: 'march8_tulips' }) } }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

async function fetchCategoriesTree() {
  const response = await axios.get(`${API_URL}/api/categories`);
  return response.data;
}

function buildMarketCategoryKeyboard(categories) {
  return categories.map((category) => [
    Markup.button.callback(category.name, `market_cat:${category.slug}`),
  ]);
}

function buildMarketSubcategoryKeyboard(category) {
  const keyboard = [
    [Markup.button.callback('Все подкатегории', 'market_subcat:__all__')],
  ];

  (category.subcategories || []).forEach((sub) => {
    keyboard.push([
      Markup.button.callback(sub.name, `market_subcat:${sub.slug}`),
    ]);
  });

  return keyboard;
}

function buildMarketAdsMessage(ads, marketData) {
  const categoryLabel = marketData.categoryName || marketData.categoryId || '—';
  const subcategoryLabel = marketData.subcategoryId
    ? (marketData.subcategoryName || marketData.subcategoryId)
    : 'Все подкатегории';

  const headerLines = [
    '🛒 Лента объявлений',
    `Категория: ${categoryLabel}`,
  ];

  if (marketData.categoryId) {
    headerLines.push(`Подкатегория: ${subcategoryLabel}`);
  }

  headerLines.push(`Страница: ${marketData.page + 1}`);

  if (!ads.length) {
    return `${headerLines.join('\n')}\n\nВ этой категории пока нет активных объявлений.`;
  }

  const startIndex = marketData.page * MARKET_PAGE_SIZE + 1;
  const blocks = ads.map((ad, index) => {
    const shortId = ad._id ? String(ad._id).slice(-6) : '—';
    const price = `${ad.price} ${ad.currency || 'BYN'}`;
    const description = truncateText(ad.description || 'Без описания', 160);

    return (
      `${startIndex + index}. ${ad.title}\n` +
      `   Цена: ${price}\n` +
      `   Описание: ${description}\n` +
      `   ID: ${shortId}`
    );
  });

  return `${headerLines.join('\n')}\n\n${blocks.join('\n\n')}`;
}

async function fetchMarketAdsList(marketData) {
  if (!marketData.categoryId) {
    throw new Error('Не выбрана категория для показа объявлений');
  }

  const params = {
    categoryId: marketData.categoryId,
    limit: MARKET_PAGE_SIZE,
    offset: (marketData.page || 0) * MARKET_PAGE_SIZE,
  };

  if (marketData.subcategoryId) {
    params.subcategoryId = marketData.subcategoryId;
  }

  const response = await axios.get(`${API_URL}/api/ads`, { params });
  return response.data.items || [];
}

async function renderMarketAds(ctx, presetAds) {
  const marketSession = ctx.session?.market;
  if (!marketSession) {
    throw new Error('Сессия /market не найдена');
  }

  const ads = Array.isArray(presetAds) ? presetAds : await fetchMarketAdsList(marketSession.data);
  const message = buildMarketAdsMessage(ads, marketSession.data);

  const keyboard = [
    [
      Markup.button.callback('⬅️ Назад', 'market_back'),
      Markup.button.callback('🔄 Ещё', 'market_more'),
    ],
  ];

  await ctx.editMessageText(message, {
    reply_markup: { inline_keyboard: keyboard },
  });

  return ads.length;
}

async function renderMarketCategories(ctx, { edit = false } = {}) {
  const marketSession = ctx.session?.market;
  if (!marketSession?.categories?.length) {
    throw new Error('Категории не найдены для /market');
  }

  const keyboard = buildMarketCategoryKeyboard(marketSession.categories);
  const text = '🛒 Выбор категории для просмотра объявлений:\nВыберите раздел:';

  if (edit) {
    await ctx.editMessageText(text, { reply_markup: { inline_keyboard: keyboard } });
  } else {
    await ctx.reply(text, { reply_markup: { inline_keyboard: keyboard } });
  }
}

async function renderMarketSubcategories(ctx, category) {
  const keyboard = buildMarketSubcategoryKeyboard(category);
  await ctx.editMessageText(
    `Категория: ${category.name}\n\nВыбери подкатегорию:`,
    { reply_markup: { inline_keyboard: keyboard } }
  );
}

function formatValidUntil(date) {
  if (!date) {
    return '—';
  }

  try {
    const parsed = new Date(date);
    return parsed.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  } catch (error) {
    return String(date);
  }
}

function formatSellerAdCard(ad = {}) {
  const statusEmoji = {
    active: '✅',
    draft: '📝',
    sold: '🔒',
    archived: '📦',
    hidden: '🙈',
    expired: '⌛️',
  }[ad.status] || '📌';

  const currency = ad.currency || 'BYN';
  const photosCount = Array.isArray(ad.photos) ? ad.photos.length : 0;

  return (
    `${statusEmoji} *${escapeMarkdown(ad.title || 'Без названия')}*\n` +
    `💰 ${ad.price} ${currency}\n` +
    `📂 ${escapeMarkdown(ad.categoryId || '—')} / ${escapeMarkdown(ad.subcategoryId || '—')}\n` +
    `🆔 \`${ad._id}\`\n` +
    `📸 Фото: ${photosCount}\n` +
    `⏳ Активно до: ${formatValidUntil(ad.validUntil)}\n` +
    `📍 LiveSpot: ${ad.isLiveSpot ? 'Включён' : 'Выключен'}\n` +
    `Статус: ${ad.status || '—'}`
  );
}

function buildSellerAdKeyboard(ad = {}) {
  const hideAction = ad.status === 'hidden' ? 'show' : 'hide';
  const hideLabel = ad.status === 'hidden' ? '👁 Показать' : '🙈 Скрыть';
  const liveAction = ad.isLiveSpot ? 'off' : 'on';
  const liveLabel = ad.isLiveSpot ? '📍 LiveSpot OFF' : '📍 LiveSpot ON';

  return {
    inline_keyboard: [
      [
        Markup.button.callback('💰 Изменить цену', `myads_price:${ad._id}`),
        Markup.button.callback('🖼 Обновить фото', `myads_photos:${ad._id}`),
      ],
      [
        Markup.button.callback('⏳ Продлить', `myads_extend:${ad._id}`),
        Markup.button.callback(hideLabel, `myads_hide:${ad._id}:${hideAction}`),
      ],
      [Markup.button.callback(liveLabel, `myads_live:${ad._id}:${liveAction}`)],
    ],
  };
}

function parsePhotoInput(text) {
  if (!text) {
    return [];
  }

  return text
    .split(/[\s,\n]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function pickAdFromResponse(data) {
  if (!data) {
    return null;
  }

  if (data.item) {
    return data.item;
  }

  if (data.ad) {
    return data.ad;
  }

  return data;
}

async function updateSellerAdMessageFromCallback(ctx, ad) {
  if (!ad || !ctx?.callbackQuery?.message) {
    return;
  }

  try {
    await ctx.editMessageText(formatSellerAdCard(ad), {
      parse_mode: 'Markdown',
      reply_markup: buildSellerAdKeyboard(ad),
    });
  } catch (error) {
    console.error('Не удалось обновить карточку объявления', error.response?.data || error.message);
  }
}

async function updateSellerAdMessageByIds(telegram, chatId, messageId, ad) {
  if (!telegram || !chatId || !messageId || !ad) {
    return;
  }

  try {
    await telegram.editMessageText(chatId, messageId, undefined, formatSellerAdCard(ad), {
      parse_mode: 'Markdown',
      reply_markup: buildSellerAdKeyboard(ad),
    });
  } catch (error) {
    console.error('Не удалось обновить сообщение продавца', error.response?.data || error.message);
  }
}

function ensureBotSession(ctx) {
  if (!ctx.session) {
    ctx.session = {};
  }
}

async function handleManageFlowInput(ctx, text) {
  const manage = ctx.session?.manageAd;

  if (!manage) {
    return;
  }

  const adId = manage.adId;

  try {
    if (manage.mode === 'price') {
      const normalized = Number(String(text).replace(',', '.'));

      if (!Number.isFinite(normalized) || normalized <= 0) {
        await ctx.reply('⚠️ Введи корректную цену, например `12.5`', { parse_mode: 'Markdown' });
        return;
      }

      const response = await axios.patch(`${API_URL}/api/ads/${adId}/price`, {
        sellerTelegramId: ctx.from.id,
        price: normalized,
      });

      const ad = pickAdFromResponse(response.data);
      await updateSellerAdMessageByIds(
        ctx.telegram,
        manage.chatId || ctx.chat.id,
        manage.messageId,
        ad
      );

      await ctx.reply(`💰 Цена обновлена до ${normalized}.`);
      ctx.session.manageAd = null;
      return;
    }

    if (manage.mode === 'photos') {
      const photos = parsePhotoInput(text);

      if (!photos.length) {
        await ctx.reply('⚠️ Пришли хотя бы одну ссылку на фото или введи /cancel.');
        return;
      }

      const response = await axios.patch(`${API_URL}/api/ads/${adId}/photos`, {
        sellerTelegramId: ctx.from.id,
        photos,
      });

      const ad = pickAdFromResponse(response.data);
      await updateSellerAdMessageByIds(
        ctx.telegram,
        manage.chatId || ctx.chat.id,
        manage.messageId,
        ad
      );

      await ctx.reply(`🖼 Фото обновлены (${photos.length}).`);
      ctx.session.manageAd = null;
      return;
    }
  } catch (error) {
    console.error('handleManageFlowInput error:', error.response?.data || error.message);
    await ctx.reply('❌ Не удалось обновить объявление. Попробуй позже.');
    ctx.session.manageAd = null;
  }

  if (ctx.session?.manageAd) {
    ctx.session.manageAd = null;
  }
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

  const startKeyboard = getMiniAppKeyboard();

  const seasonInfo = activeSeason ? `\n\n🌟 Сейчас активна: ${activeSeason.name}!` : '';
  
  await ctx.reply(
    `👋 Привет, ${firstName}!\n\n` +
    `Добро пожаловать в KETMAR Market! 🛍️${seasonInfo}\n\n` +
    `Доступные команды:\n\n` +
    `/sell - 🏪 Создать объявление\n` +
    `/my_ads - 📋 Мои объявления\n` +
    `/catalog - 📦 Каталог объявлений\n` +
    `/market - 🛒 Лента объявлений\n` +
    `/fav_list - ⭐ Избранное\n` +
    `/season - 🌟 Сезонные предложения\n` +
    `/categories - 📂 Категории\n` +
    `/myid - 🆔 Ваш Telegram ID\n` +
    `/new_test_ad - ➕ Тестовое объявление` +
    (startKeyboard ? '\n\n🔗 Используйте кнопки ниже для открытия приложения.' : ''),
    {
      ...(startKeyboard ? { reply_markup: startKeyboard } : {}),
    }
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

bot.command('fav_add', async (ctx) => {
  const [, adId] = ctx.message.text.trim().split(/\s+/, 2);

  if (!adId) {
    return ctx.reply('Использование: /fav_add <ID_объявления>');
  }

  try {
    await axios.post(`${API_URL}/api/favorites/${adId}`, {
      telegramId: ctx.from.id,
    });

    await ctx.reply('✅ Объявление добавлено в избранное.');
  } catch (error) {
    console.error('fav_add error:', error.response?.data || error.message);
    const message = error.response?.data?.error || 'Не получилось добавить в избранное (проверь ID объявления).';
    await ctx.reply(`⚠️ ${message}`);
  }
});

bot.command('fav_remove', async (ctx) => {
  const [, adId] = ctx.message.text.trim().split(/\s+/, 2);

  if (!adId) {
    return ctx.reply('Использование: /fav_remove <ID_объявления>');
  }

  try {
    await axios.delete(`${API_URL}/api/favorites/${adId}`, {
      params: { telegramId: ctx.from.id },
    });

    await ctx.reply('✅ Объявление удалено из избранного.');
  } catch (error) {
    console.error('fav_remove error:', error.response?.data || error.message);
    const message = error.response?.data?.error || 'Не получилось удалить из избранного.';
    await ctx.reply(`⚠️ ${message}`);
  }
});

function formatFavoritesList(items = []) {
  if (!items.length) {
    return 'У тебя пока нет избранных объявлений.';
  }

  const lines = ['⭐ Твои избранные объявления:'];

  items.forEach((item, index) => {
    const ad = item.ad || item.adId || item;
    if (!ad) {
      return;
    }

    const price = ad.price != null ? `${ad.price} ${ad.currency || 'BYN'}` : '—';
    const status = ad.status || item.lastKnownStatus || '—';
    const id = ad._id || item.adId || '—';

    lines.push(`${index + 1}) ${ad.title || 'Без названия'} — ${price} (${status})`);
    lines.push(`   ID: ${id}`);
  });

  return lines.join('\n');
}

bot.command('fav_list', async (ctx) => {
  try {
    const response = await axios.get(`${API_URL}/api/favorites`, {
      params: { telegramId: ctx.from.id },
    });

    const items = response.data?.items || [];
    const message = formatFavoritesList(items);
    await ctx.reply(message, { disable_web_page_preview: true });
  } catch (error) {
    console.error('fav_list error:', error.response?.data || error.message);
    await ctx.reply('⚠️ Не удалось загрузить избранное. Попробуй позже.');
  }
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

// /market - лента объявлений для покупателей
bot.command('market', async (ctx) => {
  try {
    const categories = await fetchCategoriesTree();

    if (!categories.length) {
      return ctx.reply('Категории пока не настроены. Попробуйте позже.');
    }

    ctx.session.market = {
      step: 'choose_category',
      categories,
      data: {
        categoryId: null,
        categoryName: null,
        subcategoryId: null,
        subcategoryName: null,
        page: 0,
      },
    };

    await renderMarketCategories(ctx, { edit: false });
  } catch (error) {
    console.error('Ошибка в /market:', error);
    await ctx.reply('❌ Не удалось загрузить ленту объявлений. Попробуйте позже.');
  }
});

bot.command('mod_pending', async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const jwtToken = await getModeratorJWT(telegramId);
    
    if (!jwtToken) {
      return ctx.reply('⚠️ Не удалось получить токен доступа.');
    }
    
    const response = await axios.get(`${API_URL}/api/mod/pending`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
      },
    });

    const ads = response.data?.items || [];

    if (!ads.length) {
      await ctx.reply('Нет объявлений на модерации!');
      return;
    }

    let text = '⏳ Объявления на модерации:\n\n';

    ads.forEach((ad) => {
      const title = escapeMarkdown(ad.title || 'Без названия');
      text += `ID: \`${ad._id}\`\n`;
      text += `Название: *${title}*\n`;
      text += `/mod_approve_${ad._id}\n`;
      text += `/mod_reject_${ad._id}\n\n`;
    });

    await ctx.reply(text, { parse_mode: 'Markdown' });
  } catch (error) {
    if (error.response?.status === 403) {
      await ctx.reply('🚫 У вас нет прав модератора.');
      return;
    }

    const message = error.response?.data?.error || 'Не удалось получить объявления на модерации';
    console.error('mod_pending error:', error.response?.data || error.message);
    await ctx.reply(`⚠️ ${message}`);
  }
});

bot.hears(/^\/mod_approve_(.+)/, async (ctx) => {
  const adId = ctx.match[1];
  const telegramId = ctx.from.id;

  try {
    const jwtToken = await getModeratorJWT(telegramId);
    
    if (!jwtToken) {
      return ctx.reply('⚠️ Не удалось получить токен доступа.');
    }
    
    await axios.post(
      `${API_URL}/api/mod/approve`,
      { adId },
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
        },
      }
    );

    await ctx.reply('✅ Объявление одобрено!');
  } catch (error) {
    if (error.response?.status === 403) {
      await ctx.reply('🚫 У вас нет прав модератора.');
      return;
    }

    const message = error.response?.data?.error || 'Не удалось одобрить объявление';
    console.error('mod_approve error:', error.response?.data || error.message);
    await ctx.reply(`⚠️ ${message}`);
  }
});

bot.hears(/^\/mod_reject_(.+)/, async (ctx) => {
  const adId = ctx.match[1];
  const telegramId = ctx.from.id;

  try {
    const jwtToken = await getModeratorJWT(telegramId);
    
    if (!jwtToken) {
      return ctx.reply('⚠️ Не удалось получить токен доступа.');
    }
    
    await axios.post(
      `${API_URL}/api/mod/reject`,
      { adId, comment: 'Отклонено модератором' },
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
        },
      }
    );

    await ctx.reply('ℹ️ Объявление отклонено.');
  } catch (error) {
    if (error.response?.status === 403) {
      await ctx.reply('🚫 У вас нет прав модератора.');
      return;
    }

    const message = error.response?.data?.error || 'Не удалось отклонить объявление';
    console.error('mod_reject error:', error.response?.data || error.message);
    await ctx.reply(`⚠️ ${message}`);
  }
});

bot.action(/market_cat:(.+)/, async (ctx) => {
  try {
    const slug = ctx.match[1];
    const marketSession = ctx.session?.market;

    if (!marketSession?.categories) {
      await ctx.answerCbQuery('Сначала запустите /market', { show_alert: true });
      return;
    }

    const category = marketSession.categories.find((cat) => cat.slug === slug);
    if (!category) {
      await ctx.answerCbQuery('Категория не найдена. Обновите список через /market', { show_alert: true });
      return;
    }

    marketSession.data.categoryId = category.slug;
    marketSession.data.categoryName = category.name;
    marketSession.data.subcategoryId = null;
    marketSession.data.subcategoryName = null;
    marketSession.data.page = 0;

    if (!category.subcategories || !category.subcategories.length) {
      marketSession.step = 'list_ads';
      await ctx.answerCbQuery(`Категория: ${category.name}`);
      await renderMarketAds(ctx);
      return;
    }

    marketSession.step = 'choose_subcategory';
    await ctx.answerCbQuery(`Категория: ${category.name}`);
    await renderMarketSubcategories(ctx, category);
  } catch (error) {
    console.error('Ошибка обработки market_cat:', error);
    await ctx.answerCbQuery('Не удалось выбрать категорию', { show_alert: true });
  }
});

bot.action(/market_subcat:(.+)/, async (ctx) => {
  try {
    const slug = ctx.match[1];
    const marketSession = ctx.session?.market;

    if (!marketSession?.data?.categoryId) {
      await ctx.answerCbQuery('Сначала выберите категорию через /market', { show_alert: true });
      return;
    }

    const category = (marketSession.categories || []).find(
      (cat) => cat.slug === marketSession.data.categoryId,
    );

    if (!category) {
      await ctx.answerCbQuery('Категория недоступна. Обновите список через /market', { show_alert: true });
      return;
    }

    if (slug === '__all__') {
      marketSession.data.subcategoryId = null;
      marketSession.data.subcategoryName = null;
    } else {
      const subcategory = (category.subcategories || []).find((sub) => sub.slug === slug);
      if (!subcategory) {
        await ctx.answerCbQuery('Подкатегория не найдена', { show_alert: true });
        return;
      }
      marketSession.data.subcategoryId = subcategory.slug;
      marketSession.data.subcategoryName = subcategory.name;
    }

    marketSession.data.page = 0;
    marketSession.step = 'list_ads';

    await ctx.answerCbQuery('Показываю объявления…');
    await renderMarketAds(ctx);
  } catch (error) {
    console.error('Ошибка обработки market_subcat:', error);
    await ctx.answerCbQuery('Не удалось выбрать подкатегорию', { show_alert: true });
  }
});

bot.action('market_more', async (ctx) => {
  try {
    const marketSession = ctx.session?.market;

    if (!marketSession || marketSession.step !== 'list_ads') {
      await ctx.answerCbQuery('Сначала выберите категорию через /market', { show_alert: true });
      return;
    }

    marketSession.data.page += 1;
    const ads = await fetchMarketAdsList(marketSession.data);

    if (!ads.length) {
      marketSession.data.page = Math.max(0, marketSession.data.page - 1);
      await ctx.answerCbQuery('Больше объявлений нет', { show_alert: true });
      return;
    }

    await ctx.answerCbQuery('Загружаю ещё объявления…');
    await renderMarketAds(ctx, ads);
  } catch (error) {
    console.error('Ошибка обработки market_more:', error);
    await ctx.answerCbQuery('Не удалось загрузить ещё объявления', { show_alert: true });
  }
});

bot.action('market_back', async (ctx) => {
  try {
    const marketSession = ctx.session?.market;

    if (!marketSession) {
      await ctx.answerCbQuery('Сначала запустите /market', { show_alert: true });
      return;
    }

    const category = (marketSession.categories || []).find(
      (cat) => cat.slug === marketSession.data?.categoryId,
    );

    if (marketSession.data?.subcategoryId && category) {
      marketSession.step = 'choose_subcategory';
      marketSession.data.subcategoryId = null;
      marketSession.data.subcategoryName = null;
      marketSession.data.page = 0;

      await ctx.answerCbQuery('Выберите подкатегорию');
      await renderMarketSubcategories(ctx, category);
      return;
    }

    marketSession.step = 'choose_category';
    marketSession.data = {
      categoryId: null,
      categoryName: null,
      subcategoryId: null,
      subcategoryName: null,
      page: 0,
    };

    await ctx.answerCbQuery('Выберите категорию');
    await renderMarketCategories(ctx, { edit: true });
  } catch (error) {
    console.error('Ошибка обработки market_back:', error);
    await ctx.answerCbQuery('Не удалось вернуться назад', { show_alert: true });
  }
});

bot.action(/order_(.+)/, async (ctx) => {
  try {
    const adId = ctx.match[1];

    if (ctx.session?.sell) {
      await ctx.answerCbQuery('Заверши создание объявления или отправь /cancel', { show_alert: true });
      return;
    }

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
});

bot.action(/view_(.+)/, async (ctx) => {
  try {
    const adId = ctx.match[1];
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

async function handleMyOrdersCommand(ctx) {
  try {
    const telegramId = ctx.from.id;
    const url = new URL(`${API_URL}/api/orders/my`);
    url.searchParams.set('buyerTelegramId', telegramId);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Ошибка получения заказов');
    }

    const payload = await response.json();
    const orders = Array.isArray(payload) ? payload : payload.items || [];

    if (orders.length === 0) {
      return ctx.reply('📋 У вас пока нет заказов.');
    }

    await ctx.reply(`📋 **Ваши заказы** (${orders.length}):`, { parse_mode: 'Markdown' });

    const statusEmoji = {
      new: '🆕',
      processed: '⚙️',
      completed: '✅',
      cancelled: '❌',
    };

    for (const order of orders) {
      const itemsList = order.items
        .map((item) => {
          const currency = item.currency || 'BYN';
          const total = item.price * item.quantity;
          return `  • ${item.title} × ${item.quantity} = ${total} ${currency}`;
        })
        .join('\n');

      const totalPrice = order.totalPrice || order.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const totalCurrency = order.items[0]?.currency || 'BYN';
      const orderIdShort = (order._id?.toString() || '').slice(-6) || '000000';

      const message =
        `**Заказ #${orderIdShort}**\n\n` +
        `${itemsList}\n\n` +
        `💰 Итого: **${totalPrice} ${totalCurrency}**\n` +
        `📊 Статус: ${statusEmoji[order.status] || '❓'} ${order.status}\n` +
        `📅 Дата: ${new Date(order.createdAt).toLocaleDateString('ru-RU')}` +
        (order.comment ? `\n💬 Комментарий: ${order.comment}` : '');

      await ctx.reply(message, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Ошибка в /my_orders:', error);
    await ctx.reply('❌ Произошла ошибка при загрузке заказов.');
  }
}

bot.command('my_orders', handleMyOrdersCommand);
bot.command('myorders', handleMyOrdersCommand);

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
    // забираем дерево категорий
    const res = await axios.get(`${API_URL}/api/categories`);
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
    ensureBotSession(ctx);
    const telegramId = ctx.from.id;
    const limit = Number(process.env.MY_ADS_LIMIT || 10);

    const res = await axios.get(`${API_URL}/api/ads/my`, {
      params: { sellerTelegramId: telegramId, limit },
    });

    const ads = res.data.items || [];

    if (!ads.length) {
      return ctx.reply(
        "📭 У тебя пока нет объявлений.\n\n" +
          "Создай своё первое объявление командой /sell"
      );
    }

    await ctx.reply(
      `📋 Найдено ${ads.length} объявлений.\nВыбери действие под нужной карточкой.\n\n` +
        "Чтобы отменить любое действие, введи /cancel",
      { disable_web_page_preview: true }
    );

    for (const ad of ads) {
      await ctx.reply(formatSellerAdCard(ad), {
        parse_mode: 'Markdown',
        reply_markup: buildSellerAdKeyboard(ad),
        disable_web_page_preview: true,
      });
    }
  } catch (err) {
    console.error("/my_ads error:", err.response?.data || err.message);
    ctx.reply("⚠️ Ошибка при загрузке объявлений. Попробуй позже.");
  }
});

bot.action(/myads_price:(.+)/, async (ctx) => {
  try {
    ensureBotSession(ctx);
    const adId = ctx.match[1];
    ctx.session.manageAd = {
      mode: 'price',
      adId,
      chatId: ctx.callbackQuery?.message?.chat?.id,
      messageId: ctx.callbackQuery?.message?.message_id,
    };

    await ctx.answerCbQuery('Введи новую цену');
    await ctx.reply(
      `💰 Введи новую цену для объявления \`${adId}\` (в BYN).\n` +
        'Используй точку для копеек. Отмена — /cancel',
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('myads_price error:', error.response?.data || error.message);
    await ctx.answerCbQuery('Ошибка запуска редактирования', { show_alert: true });
  }
});

bot.action(/myads_photos:(.+)/, async (ctx) => {
  try {
    ensureBotSession(ctx);
    const adId = ctx.match[1];
    ctx.session.manageAd = {
      mode: 'photos',
      adId,
      chatId: ctx.callbackQuery?.message?.chat?.id,
      messageId: ctx.callbackQuery?.message?.message_id,
    };

    await ctx.answerCbQuery('Пришли ссылки на фото');
    await ctx.reply(
      `🖼 Пришли ссылки на новые фото для \`${adId}\`.\n` +
        'Разделяй их пробелом или переводом строки. Отмена — /cancel',
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('myads_photos error:', error.response?.data || error.message);
    await ctx.answerCbQuery('Ошибка подготовки редактирования', { show_alert: true });
  }
});

bot.action(/myads_extend:(.+)/, async (ctx) => {
  const adId = ctx.match[1];

  try {
    const response = await axios.post(`${API_URL}/api/ads/${adId}/extend`, {
      sellerTelegramId: ctx.from.id,
    });

    const ad = pickAdFromResponse(response.data);
    await updateSellerAdMessageFromCallback(ctx, ad);

    await ctx.answerCbQuery(`Продлено до ${formatValidUntil(ad?.validUntil)}`);
  } catch (error) {
    console.error('myads_extend error:', error.response?.data || error.message);
    await ctx.answerCbQuery('Не удалось продлить объявление', { show_alert: true });
  }
});

bot.action(/myads_hide:([^:]+):(hide|show)/, async (ctx) => {
  const adId = ctx.match[1];
  const action = ctx.match[2];

  try {
    const response = await axios.post(`${API_URL}/api/ads/${adId}/hide`, {
      sellerTelegramId: ctx.from.id,
      hidden: action === 'hide',
    });

    const ad = pickAdFromResponse(response.data);
    await updateSellerAdMessageFromCallback(ctx, ad);

    await ctx.answerCbQuery(action === 'hide' ? 'Объявление скрыто' : 'Объявление показано');
  } catch (error) {
    console.error('myads_hide error:', error.response?.data || error.message);
    await ctx.answerCbQuery('Не удалось обновить статус', { show_alert: true });
  }
});

bot.action(/myads_live:([^:]+):(on|off)/, async (ctx) => {
  const adId = ctx.match[1];
  const action = ctx.match[2];
  const endpoint = action === 'on' ? 'on' : 'off';

  try {
    const response = await axios.post(`${API_URL}/api/ads/${adId}/liveSpot/${endpoint}`, {
      sellerTelegramId: ctx.from.id,
    });

    const ad = pickAdFromResponse(response.data);
    await updateSellerAdMessageFromCallback(ctx, ad);

    await ctx.answerCbQuery(action === 'on' ? 'LiveSpot включён' : 'LiveSpot выключен');
  } catch (error) {
    console.error('myads_live error:', error.response?.data || error.message);
    await ctx.answerCbQuery('Не удалось обновить LiveSpot', { show_alert: true });
  }
});

// Обработка выбора категории (callback sell_cat:<slug>)
bot.action(/sell_cat:(.+)/, async (ctx) => {
  try {
    const slug = ctx.match[1];

    // убеждаемся, что мы в режиме sell
    if (!ctx.session || !ctx.session.sell) {
      return ctx.answerCbQuery("Диалог создания объявления не активен. Введи /sell.");
    }

    ctx.session.sell.data.categoryId = slug;

    // забираем дерево категорий
    const res = await axios.get(`${API_URL}/api/categories`);
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

// Обработка запроса геолокации при создании объявления
bot.action("sell_location_yes", async (ctx) => {
  try {
    if (!ctx.session || !ctx.session.sell) {
      return ctx.answerCbQuery("Диалог создания объявления не активен. Введи /sell.");
    }

    ctx.session.sell.step = "waiting_location";

    await ctx.answerCbQuery("Отправь свою геолокацию");
    await ctx.reply(
      "📍 Отправь своё местоположение через кнопку 📎 (скрепка) → Геопозиция.\n\n" +
      "Или нажми /cancel чтобы отменить создание объявления.",
      {
        reply_markup: {
          keyboard: [
            [
              {
                text: "📍 Отправить геопозицию",
                request_location: true,
              },
            ],
            [{ text: "/cancel" }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  } catch (err) {
    console.error("sell_location_yes error:", err.response?.data || err.message);
    ctx.reply("⚠️ Ошибка. Попробуй ещё раз /sell.");
  }
});

// Пропуск геолокации при создании объявления
bot.action("sell_location_skip", async (ctx) => {
  try {
    if (!ctx.session || !ctx.session.sell) {
      return ctx.answerCbQuery("Диалог создания объявления не активен. Введи /sell.");
    }

    await ctx.answerCbQuery("Геолокация пропущена");
    
    ctx.session.sell.data.location = null;
    ctx.session.sell.step = "finalize";

    await finalizeAdCreation(ctx);
  } catch (err) {
    console.error("sell_location_skip error:", err.response?.data || err.message);
    ctx.reply("⚠️ Ошибка. Попробуй ещё раз /sell.");
  }
});

// Обработка входящей геолокации
bot.on("location", async (ctx) => {
  try {
    if (!ctx.session || !ctx.session.sell || ctx.session.sell.step !== "waiting_location") {
      return;
    }

    const { latitude, longitude } = ctx.message.location;

    // Строгая валидация координат
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      console.warn('Invalid location coordinates received:', {
        latitude,
        longitude,
        userId: ctx.from?.id,
      });
      ctx.session.sell = null;
      return ctx.reply(
        "⚠️ Получены некорректные координаты. Попробуй ещё раз /sell.",
        {
          reply_markup: {
            remove_keyboard: true,
          },
        }
      );
    }

    ctx.session.sell.data.location = {
      lat: latitude,
      lng: longitude,
    };

    ctx.session.sell.step = "finalize";

    await ctx.reply(
      `✅ Местоположение получено:\n📍 ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n\n` +
      "Создаю объявление...",
      {
        reply_markup: {
          remove_keyboard: true,
        },
      }
    );

    await finalizeAdCreation(ctx);
  } catch (err) {
    console.error("location handler error:", err.response?.data || err.message);
    ctx.reply("⚠️ Ошибка при обработке геолокации. Попробуй ещё раз /sell.");
  }
});

// Обработка текстовых сообщений в процессе /sell и оформления заказа
bot.on("text", async (ctx) => {
  const text = ctx.message.text.trim();
  const normalized = text.toLowerCase();
  const hasSellFlow = Boolean(ctx.session?.sell);
  const hasOrderFlow = Boolean(ctx.session?.orderFlow);
  const hasManageFlow = Boolean(ctx.session?.manageAd);
  const hasMarketFlow = Boolean(ctx.session?.market);
  const hasModRejectFlow = Boolean(ctx.session?.modReject);

  const isCancelCommand = normalized === "/cancel" || normalized === "отмена";

  if (!hasSellFlow && !hasOrderFlow && !hasManageFlow && !hasModRejectFlow && !(hasMarketFlow && isCancelCommand)) {
    // нет активного мастера — игнорируем, пусть другие хендлеры сработают
    return;
  }

  if (isCancelCommand) {
    const wasSell = Boolean(ctx.session?.sell);
    const wasOrder = Boolean(ctx.session?.orderFlow);
    const wasManage = Boolean(ctx.session?.manageAd);
    const wasMarket = Boolean(ctx.session?.market);
    const wasModReject = Boolean(ctx.session?.modReject);
    ctx.session.sell = null;
    ctx.session.orderFlow = null;
    ctx.session.manageAd = null;
    ctx.session.market = null;
    ctx.session.modReject = null;

    if (wasSell || wasOrder || wasMarket || wasManage || wasModReject) {
      await ctx.reply("Диалог отменён. Можно начать заново в любое время.");
      return;
    }
  }

  // Позволяем другим командам Telegraf обрабатывать сообщения, кроме /cancel
  if (text.startsWith("/") && !isCancelCommand) {
    return;
  }

  // Обработка ввода причины отклонения объявления модератором
  if (hasModRejectFlow) {
    try {
      const { adId, telegramId } = ctx.session.modReject;
      const comment = normalized === '-' ? '' : text;
      
      const jwtToken = await getModeratorJWT(telegramId);
      
      if (!jwtToken) {
        ctx.session.modReject = null;
        return ctx.reply('⚠️ Ошибка аутентификации.');
      }

      await axios.post(
        `${API_URL}/api/mod/reject`,
        { adId, comment },
        {
          headers: {
            'Authorization': `Bearer ${jwtToken}`,
          },
        }
      );

      ctx.session.modReject = null;
      await ctx.reply('❌ Объявление отклонено. Продавец получит уведомление.');
    } catch (err) {
      console.error('modReject flow error:', err.response?.data || err.message);
      ctx.session.modReject = null;
      await ctx.reply('⚠️ Ошибка при отклонении объявления. Попробуйте позже.');
    }
    return;
  }

  if (hasManageFlow) {
    await handleManageFlowInput(ctx, text);
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
      sell.step = "location";

      // Предлагаем указать геолокацию
      await ctx.reply(
        "📍 Шаг 6/6 — Хочешь указать местоположение товара?\n\n" +
        "Это поможет покупателям найти товар рядом с собой.",
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Да, указать", callback_data: "sell_location_yes" },
                { text: "⏭ Пропустить", callback_data: "sell_location_skip" },
              ],
            ],
          },
        }
      );
      return;
    }

    // Шаг: завершение (после геолокации или пропуска)
    if (sell.step === "finalize") {
      await finalizeAdCreation(ctx);
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


// /moderation - панель модератора
bot.command('moderation', async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    
    const userRes = await axios.get(`${API_URL}/api/users/${telegramId}`);
    const user = userRes.data;
    
    if (!user || (!user.isModerator && user.role !== 'moderator' && user.role !== 'admin')) {
      return ctx.reply('⛔️ У вас нет прав для модерации.');
    }
    
    const jwtToken = await getModeratorJWT(telegramId);
    
    if (!jwtToken) {
      return ctx.reply('⚠️ Не удалось получить токен доступа.');
    }
    
    const adsRes = await axios.get(`${API_URL}/api/mod/pending`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
      },
    });
    
    const ads = adsRes.data.items || [];
    
    if (ads.length === 0) {
      return ctx.reply('✅ Нет объявлений на модерации.');
    }
    
    await ctx.reply(`📋 Объявлений на модерации: ${ads.length}\n\nВыберите действие:`);
    
    for (const ad of ads) {
      const text = 
        `📌 *${escapeMarkdown(ad.title)}*\n` +
        `💰 Цена: ${ad.price} ${ad.currency || 'BYN'}\n` +
        `👤 Продавец: ${ad.sellerTelegramId}\n` +
        `🆔 ID: \`${ad._id}\`\n` +
        `📅 Создано: ${new Date(ad.createdAt).toLocaleDateString('ru-RU')}`;
      
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Одобрить', `mod_approve:${ad._id}`),
          Markup.button.callback('❌ Отклонить', `mod_reject:${ad._id}`),
        ],
        [
          Markup.button.callback('🔍 Открыть', `mod_view:${ad._id}`),
        ],
      ]);
      
      await ctx.reply(text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard.reply_markup,
      });
    }
  } catch (err) {
    console.error('/moderation error:', err.response?.data || err.message);
    ctx.reply('⚠️ Ошибка при загрузке объявлений на модерации.');
  }
});

// Обработчик одобрения объявления
bot.action(/mod_approve:(.+)/, async (ctx) => {
  try {
    const adId = ctx.match[1];
    const telegramId = ctx.from.id;
    
    const jwtToken = await getModeratorJWT(telegramId);
    
    if (!jwtToken) {
      return ctx.answerCbQuery('⚠️ Ошибка аутентификации');
    }
    
    await axios.post(
      `${API_URL}/api/mod/approve`,
      { adId },
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
        },
      }
    );
    
    await ctx.answerCbQuery('✅ Объявление одобрено!');
    await ctx.editMessageReplyMarkup({
      inline_keyboard: [
        [{ text: '✅ Одобрено', callback_data: 'noop' }],
      ],
    });
  } catch (err) {
    console.error('mod_approve error:', err.response?.data || err.message);
    await ctx.answerCbQuery('⚠️ Ошибка при одобрении', { show_alert: true });
  }
});

// Обработчик отклонения объявления
bot.action(/mod_reject:(.+)/, async (ctx) => {
  try {
    const adId = ctx.match[1];
    const telegramId = ctx.from.id;
    
    ensureBotSession(ctx);
    ctx.session.modReject = { adId, telegramId };
    
    await ctx.answerCbQuery('Введите причину отклонения');
    await ctx.reply(
      `❌ Отклонение объявления \`${adId}\`\n\n` +
      'Введите причину отклонения или отправьте "-" без комментария.\n' +
      'Отмена: /cancel',
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error('mod_reject error:', err.response?.data || err.message);
    await ctx.answerCbQuery('⚠️ Ошибка', { show_alert: true });
  }
});

// Обработчик просмотра объявления
bot.action(/mod_view:(.+)/, async (ctx) => {
  try {
    const adId = ctx.match[1];
    
    const response = await axios.get(`${API_URL}/api/ads/${adId}`);
    const ad = response.data.item || response.data;
    
    const photoText = ad.photos && ad.photos.length > 0
      ? `\n📸 Фото: ${ad.photos.length} шт.`
      : '\n📸 Нет фото';
    
    const text =
      `*${escapeMarkdown(ad.title)}*\n\n` +
      `${escapeMarkdown(ad.description || 'Без описания')}\n\n` +
      `💰 Цена: ${ad.price} ${ad.currency || 'BYN'}\n` +
      `📂 Категория: ${ad.categoryId?.name || ad.categoryId}\n` +
      `👤 Продавец: ${ad.sellerTelegramId}\n` +
      `📅 Создано: ${new Date(ad.createdAt).toLocaleDateString('ru-RU')}` +
      photoText;
    
    await ctx.answerCbQuery('Просмотр объявления');
    await ctx.reply(text, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('mod_view error:', err.response?.data || err.message);
    await ctx.answerCbQuery('⚠️ Не удалось загрузить', { show_alert: true });
  }
});

// Обработка ошибок
bot.catch((err, ctx) => {
  console.error('❌ Ошибка в боте:', err);
  ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
});

bot.sendFavoriteUpdateNotification = sendFavoriteUpdateNotification;

module.exports = bot;
module.exports.bot = bot;
