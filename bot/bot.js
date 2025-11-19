const { Telegraf, session } = require('telegraf');
const axios = require('axios');
const { BOT_TOKEN, API_BASE_URL } = require('../config/config.js');

const API_BASE = API_BASE_URL || 'http://localhost:3000';
const MARKET_LIST_LIMIT = 5;

async function fetchCategories() {
  const response = await axios.get(`${API_BASE}/api/categories`);
  return response.data || [];
}

function getRootCategories(categories) {
  return (categories || []).filter((category) => !category.parentSlug);
}

function initMarketSession(ctx) {
  if (!ctx.session) {
    ctx.session = {};
  }

  if (!ctx.session.market) {
    ctx.session.market = {
      step: 'choose_category',
      categories: [],
      availableSubcategories: [],
      data: {
        categoryId: null,
        categoryName: null,
        subcategoryId: null,
        subcategoryName: null,
        page: 0,
      },
    };
  }

  return ctx.session.market;
}

function formatAdsListMessage(ads, session, offset) {
  const { categoryName, subcategoryName } = session.data;
  const title =
    `🛒 ${categoryName || 'Категория'}` +
    (subcategoryName ? ` → ${subcategoryName}` : '') +
    '\nСвежие объявления:';

  const blocks = ads.map((ad, index) => {
    const counter = offset + index + 1;
    const price =
      typeof ad.price === 'number' ? `${ad.price} ${ad.currency || 'BYN'}` : 'Цена не указана';
    const description = ad.description?.trim() || 'Описание отсутствует';
    const shortDescription =
      description.length > 180 ? `${description.slice(0, 180)}…` : description;
    const shortId = ad._id ? ad._id.toString().slice(-6) : '—';

    return (
      `${counter}. ${ad.title}\n` +
      `   Цена: ${price}\n` +
      `   Описание: ${shortDescription}\n` +
      `   ID: ${shortId}`
    );
  });

  return `${title}\n\n${blocks.join('\n\n')}`;
}

function buildContactKeyboard(ads, offset) {
  const buttons = ads
    .filter((ad) => ad.sellerTelegramId)
    .map((ad, index) => [
      {
        text: `Написать продавцу #${offset + index + 1}`,
        url: `tg://user?id=${ad.sellerTelegramId}`,
      },
    ]);

  buttons.push([
    { text: '⬅️ Назад', callback_data: 'market_back' },
    { text: '🔄 Ещё', callback_data: 'market_more' },
  ]);

  return buttons;
}

async function fetchAdsForSession(session, page) {
  const { categoryId, subcategoryId } = session.data;
  const params = {
    limit: MARKET_LIST_LIMIT,
    offset: page * MARKET_LIST_LIMIT,
    categoryId,
  };

  if (subcategoryId) {
    params.subcategoryId = subcategoryId;
  }

  const { data } = await axios.get(`${API_BASE}/api/ads`, { params });
  return data?.items || [];
}

async function renderMarketAdsPage(ctx, session, page, { edit = true, adsOverride = null } = {}) {
  const ads = adsOverride ?? (await fetchAdsForSession(session, page));

  if (!ads.length) {
    if (page === 0) {
      const keyboard = [[{ text: '⬅️ Назад', callback_data: 'market_back' }]];
      const replyPayload = {
        reply_markup: {
          inline_keyboard: keyboard,
        },
      };

      if (edit) {
        await ctx.editMessageText('В этой категории пока нет активных объявлений.', replyPayload);
      } else {
        await ctx.reply('В этой категории пока нет активных объявлений.', replyPayload);
      }
    }

    return 0;
  }

  const offset = page * MARKET_LIST_LIMIT;
  const message = formatAdsListMessage(ads, session, offset);
  const keyboard = {
    reply_markup: {
      inline_keyboard: buildContactKeyboard(ads, offset),
    },
  };

  if (edit) {
    await ctx.editMessageText(message, keyboard);
  } else {
    await ctx.reply(message, keyboard);
  }

  session.data.page = page;
  return ads.length;
}

function startBot() {
  if (!BOT_TOKEN) {
    console.warn('[bot] BOT_TOKEN не задан, бот не будет запущен');
    return null;
  }

  const bot = new Telegraf(BOT_TOKEN);

  bot.use(session());

  bot.start(async (ctx) => {
    await ctx.reply(
      'Привет! Я бот маркетплейса объявлений. Доступные команды:\n' +
        '/myid — показать ваш Telegram ID\n' +
        '/market — лента объявлений по категориям'
    );
  });

  bot.command('myid', async (ctx) => {
    const user = ctx.from;
    await ctx.reply(
      `ID: ${user.id}\nUsername: ${user.username || '—'}\nИмя: ${user.first_name || '—'}`
    );
  });

  // /sell — мастер создания объявления: выбор категории, подкатегории, затем поля
  bot.command('sell', async (ctx) => {
    try {
      // забираем дерево категорий
      const categories = await fetchCategories();

      // фильтруем только корневые категории (parentSlug == null)
      const rootCats = categories.filter((c) => !c.parentSlug);

      if (!rootCats.length) {
        return ctx.reply('Категории пока не настроены. Обратитесь к администратору.');
      }

      // сохраняем в сессию, что мы в режиме создания объявления
      ctx.session.sell = {
        step: 'choose_category',
        data: {},
      };

      // собираем inline-клавиатуру по корневым категориям
      const keyboard = rootCats.map((cat) => [
        {
          text: cat.name,
          callback_data: `sell_cat:${cat.slug}`,
        },
      ]);

      await ctx.reply('🧩 Шаг 1/5 — выбери категорию:', {
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });
    } catch (err) {
      console.error('/sell error:', err.response?.data || err.message);
      ctx.reply('⚠️ Ошибка при подготовке категорий. Попробуй позже.');
    }
  });

  // Обработка выбора категории (callback sell_cat:<slug>)
  bot.action(/sell_cat:(.+)/, async (ctx) => {
    try {
      const slug = ctx.match[1];

      // убеждаемся, что мы в режиме sell
      if (!ctx.session || !ctx.session.sell) {
        return ctx.answerCbQuery('Диалог создания объявления не активен. Введи /sell.');
      }

      ctx.session.sell.data.categoryId = slug;

      // забираем дерево категорий
      const categories = await fetchCategories();

      // находим выбранную корневую категорию
      const rootCat = categories.find((c) => c.slug === slug);
      if (!rootCat) {
        return ctx.answerCbQuery('Категория не найдена.');
      }

      const subcats = rootCat.subcategories || [];
      if (!subcats.length) {
        // если нет подкатегорий — сразу переходим к заголовку
        ctx.session.sell.data.subcategoryId = null;
        ctx.session.sell.step = 'title';

        await ctx.editMessageText(
          `Категория: ${rootCat.name}\n\n` +
            'Шаг 2/5 — введи заголовок объявления (например: «Свежая малина»).'
        );
        return;
      }

      // есть подкатегории — показываем их
      ctx.session.sell.step = 'choose_subcategory';

      const keyboard = subcats.map((sub) => [
        {
          text: sub.name,
          callback_data: `sell_subcat:${sub.slug}`,
        },
      ]);

      await ctx.editMessageText(
        `Категория: ${rootCat.name}\n\n` + '🧩 Шаг 2/5 — выбери подкатегорию:',
        {
          reply_markup: {
            inline_keyboard: keyboard,
          },
        }
      );
    } catch (err) {
      console.error('sell_cat error:', err.response?.data || err.message);
      ctx.reply('⚠️ Ошибка при обработке категории. Попробуй ещё раз /sell.');
    }
  });

  bot.command('market', async (ctx) => {
    try {
      const categories = await fetchCategories();
      const rootCats = getRootCategories(categories);

      if (!rootCats.length) {
        return ctx.reply('Категории пока не настроены. Обратитесь к администратору.');
      }

      const marketSession = initMarketSession(ctx);
      marketSession.step = 'choose_category';
      marketSession.categories = categories;
      marketSession.availableSubcategories = [];
      marketSession.data = {
        categoryId: null,
        categoryName: null,
        subcategoryId: null,
        subcategoryName: null,
        page: 0,
      };

      const keyboard = rootCats.map((cat) => [
        {
          text: cat.name,
          callback_data: `market_cat:${cat.slug}`,
        },
      ]);

      await ctx.reply('🛒 Выбор категории для просмотра объявлений:', {
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });
    } catch (error) {
      console.error('/market error:', error.response?.data || error.message);
      ctx.reply('⚠️ Не удалось загрузить категории. Попробуй позже.');
    }
  });

  bot.action(/market_cat:(.+)/, async (ctx) => {
    try {
      const marketSession = ctx.session?.market;
      if (!marketSession) {
        await ctx.answerCbQuery('Диалог не активен. Введи /market.');
        return;
      }

      const slug = ctx.match[1];
      const categories = marketSession.categories?.length
        ? marketSession.categories
        : await fetchCategories();
      marketSession.categories = categories;

      const rootCat = categories.find((cat) => cat.slug === slug);
      if (!rootCat) {
        await ctx.answerCbQuery('Категория не найдена.');
        return;
      }

      marketSession.data.categoryId = slug;
      marketSession.data.categoryName = rootCat.name;
      marketSession.data.subcategoryId = null;
      marketSession.data.subcategoryName = null;
      marketSession.data.page = 0;
      marketSession.availableSubcategories = rootCat.subcategories || [];

      if (!marketSession.availableSubcategories.length) {
        marketSession.step = 'list_ads';
        await ctx.editMessageText(
          `Категория: ${rootCat.name}\n\nПоказываю свежие объявления...`
        );
        await renderMarketAdsPage(ctx, marketSession, 0);
      } else {
        marketSession.step = 'choose_subcategory';
        const keyboard = [
          [
            {
              text: 'Все подкатегории',
              callback_data: 'market_subcat:__all__',
            },
          ],
          ...marketSession.availableSubcategories.map((sub) => [
            {
              text: sub.name,
              callback_data: `market_subcat:${sub.slug}`,
            },
          ]),
        ];

        await ctx.editMessageText(
          `Категория: ${rootCat.name}\n\n🧩 Шаг 2/3 — выбери подкатегорию:`,
          {
            reply_markup: {
              inline_keyboard: keyboard,
            },
          }
        );
      }

      await ctx.answerCbQuery();
    } catch (error) {
      console.error('market_cat error:', error.response?.data || error.message);
      await ctx.reply('⚠️ Ошибка при выборе категории. Попробуй ещё раз /market.');
    }
  });

  bot.action(/market_subcat:(.+)/, async (ctx) => {
    try {
      const marketSession = ctx.session?.market;
      if (!marketSession) {
        await ctx.answerCbQuery('Диалог не активен. Введи /market.');
        return;
      }

      if (!marketSession.data.categoryId) {
        await ctx.answerCbQuery('Сначала выбери категорию.');
        return;
      }

      const slug = ctx.match[1];

      if (slug === '__all__') {
        marketSession.data.subcategoryId = null;
        marketSession.data.subcategoryName = null;
      } else {
        const sub = (marketSession.availableSubcategories || []).find((item) => item.slug === slug);
        if (!sub) {
          await ctx.answerCbQuery('Подкатегория не найдена.');
          return;
        }
        marketSession.data.subcategoryId = sub.slug;
        marketSession.data.subcategoryName = sub.name;
      }

      marketSession.step = 'list_ads';
      marketSession.data.page = 0;

      await ctx.editMessageText(
        `Категория: ${marketSession.data.categoryName}` +
          (marketSession.data.subcategoryName
            ? ` → ${marketSession.data.subcategoryName}`
            : '') +
          '\n\nПоказываю свежие объявления...'
      );

      await renderMarketAdsPage(ctx, marketSession, 0);
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('market_subcat error:', error.response?.data || error.message);
      await ctx.reply('⚠️ Ошибка при выборе подкатегории. Попробуй ещё раз /market.');
    }
  });

  bot.action('market_more', async (ctx) => {
    try {
      const marketSession = ctx.session?.market;
      if (!marketSession || marketSession.step !== 'list_ads') {
        await ctx.answerCbQuery('Сначала выбери категорию через /market.');
        return;
      }

      const nextPage = marketSession.data.page + 1;
      const ads = await fetchAdsForSession(marketSession, nextPage);
      if (!ads.length) {
        await ctx.answerCbQuery('Больше объявлений нет');
        return;
      }

      await renderMarketAdsPage(ctx, marketSession, nextPage, {
        adsOverride: ads,
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('market_more error:', error.response?.data || error.message);
      await ctx.answerCbQuery('Ошибка обновления списка.');
    }
  });

  bot.action('market_back', async (ctx) => {
    try {
      const marketSession = ctx.session?.market;
      if (!marketSession) {
        await ctx.answerCbQuery('Диалог не активен. Введи /market.');
        return;
      }

      const subcats = marketSession.availableSubcategories || [];
      if (marketSession.step === 'list_ads' && subcats.length) {
        marketSession.step = 'choose_subcategory';
        marketSession.data.subcategoryId = null;
        marketSession.data.subcategoryName = null;
        marketSession.data.page = 0;

        const keyboard = [
          [
            {
              text: 'Все подкатегории',
              callback_data: 'market_subcat:__all__',
            },
          ],
          ...subcats.map((sub) => [
            {
              text: sub.name,
              callback_data: `market_subcat:${sub.slug}`,
            },
          ]),
        ];

        await ctx.editMessageText(
          `Категория: ${marketSession.data.categoryName}\n\n🧩 Шаг 2/3 — выбери подкатегорию:`,
          {
            reply_markup: {
              inline_keyboard: keyboard,
            },
          }
        );
        await ctx.answerCbQuery();
        return;
      }

      const categories = marketSession.categories?.length
        ? marketSession.categories
        : await fetchCategories();
      marketSession.categories = categories;
      const rootCats = getRootCategories(categories);

      if (!rootCats.length) {
        await ctx.editMessageText('Категории пока не настроены. Обратитесь к администратору.');
        await ctx.answerCbQuery();
        return;
      }

      marketSession.step = 'choose_category';
      marketSession.availableSubcategories = [];
      marketSession.data = {
        categoryId: null,
        categoryName: null,
        subcategoryId: null,
        subcategoryName: null,
        page: 0,
      };

      const keyboard = rootCats.map((cat) => [
        {
          text: cat.name,
          callback_data: `market_cat:${cat.slug}`,
        },
      ]);

      await ctx.editMessageText('🛒 Выбор категории для просмотра объявлений:', {
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('market_back error:', error.response?.data || error.message);
      await ctx.answerCbQuery('Не удалось вернуться назад.');
    }
  });

  bot.launch();
  console.log('[bot] Bot launched');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  return bot;
}

module.exports = { startBot };
