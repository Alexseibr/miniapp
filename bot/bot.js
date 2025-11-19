const { Telegraf, session } = require('telegraf');
const axios = require('axios');
const { BOT_TOKEN, API_BASE_URL } = require('../config/config.js');

const API_BASE = API_BASE_URL || 'http://localhost:3000';
const MARKET_LIST_LIMIT = 5;

async function fetchCategories() {
  const response = await axios.get(`${API_BASE}/api/categories`);
  return response.data || [];
}

function formatAdCard(ad) {
  const price =
    typeof ad.price === 'number' ? `${ad.price} ${ad.currency || 'BYN'}` : 'Цена не указана';
  const description = ad.description ? ad.description.trim() : '';
  const shortDescription = description
    ? `${description.slice(0, 200)}${description.length > 200 ? '…' : ''}`
    : 'Описание отсутствует';

  return `🔸 ${ad.title}\n💰 ${price}\n${shortDescription}`;
}

async function showMarketAds(ctx, { categoryName, subcategoryName, categoryId, subcategoryId }) {
  try {
    const params = {
      limit: MARKET_LIST_LIMIT,
      categoryId,
    };
    if (subcategoryId) {
      params.subcategoryId = subcategoryId;
    }

    const { data } = await axios.get(`${API_BASE}/api/ads`, { params });
    const ads = data?.items || [];

    if (!ads.length) {
      await ctx.reply('В этой подборке пока нет объявлений. Попробуй выбрать другую категорию.');
      return;
    }

    const header =
      `📂 ${categoryName}` + (subcategoryName ? ` → ${subcategoryName}` : '') + '\nНовые объявления:';
    await ctx.reply(header);

    for (const ad of ads) {
      await ctx.reply(formatAdCard(ad), {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Написать продавцу',
                url: `tg://user?id=${ad.sellerTelegramId}`,
              },
            ],
          ],
        },
      });
    }
  } catch (error) {
    console.error('market ads error:', error.response?.data || error.message);
    await ctx.reply('⚠️ Не удалось загрузить объявления. Попробуй позже.');
  } finally {
    if (ctx.session) {
      ctx.session.market = null;
    }
  }
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
        '/market — посмотреть свежие объявления'
    );
  });

  bot.command('myid', async (ctx) => {
    const user = ctx.from;
    await ctx.reply(
      `ID: ${user.id}\nUsername: ${user.username || '—'}\nИмя: ${user.first_name || '—'}`
    );
  });

  bot.command('market', async (ctx) => {
    try {
      const categories = await fetchCategories();
      const rootCats = categories.filter((c) => !c.parentSlug);

      if (!rootCats.length) {
        return ctx.reply('Категории пока не настроены. Обратитесь к администратору.');
      }

      ctx.session.market = {
        step: 'choose_category',
        data: {},
      };

      const keyboard = rootCats.map((cat) => [
        {
          text: cat.name,
          callback_data: `market_cat:${cat.slug}`,
        },
      ]);

      await ctx.reply('🛍 Шаг 1/3 — выбери категорию:', {
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });
    } catch (error) {
      console.error('/market error:', error.response?.data || error.message);
      ctx.reply('⚠️ Не удалось загрузить категории. Попробуй позже.');
    }
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

  bot.action(/market_cat:(.+)/, async (ctx) => {
    try {
      if (!ctx.session || !ctx.session.market) {
        await ctx.answerCbQuery('Диалог не активен. Введи /market.');
        return;
      }

      const slug = ctx.match[1];
      ctx.session.market.data.categoryId = slug;

      const categories = await fetchCategories();
      const rootCat = categories.find((c) => c.slug === slug);
      if (!rootCat) {
        await ctx.answerCbQuery('Категория не найдена.');
        return;
      }

      const subcats = rootCat.subcategories || [];
      if (!subcats.length) {
        ctx.session.market.data.subcategoryId = null;
        ctx.session.market.step = 'show_ads';

        await ctx.editMessageText(
          `Категория: ${rootCat.name}\n\nПоказываю свежие объявления...`
        );
        await showMarketAds(ctx, {
          categoryName: rootCat.name,
          subcategoryName: null,
          categoryId: slug,
          subcategoryId: null,
        });
        await ctx.answerCbQuery();
        return;
      }

      ctx.session.market.step = 'choose_subcategory';

      const keyboard = [
        [
          {
            text: 'Все подкатегории',
            callback_data: `market_subcat:${slug}:all`,
          },
        ],
        ...subcats.map((sub) => [
          {
            text: sub.name,
            callback_data: `market_subcat:${slug}:${sub.slug}`,
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
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('market_cat error:', error.response?.data || error.message);
      await ctx.reply('⚠️ Ошибка при выборе категории. Попробуй ещё раз /market.');
    }
  });

  bot.action(/market_subcat:([^:]+):(.+)/, async (ctx) => {
    try {
      if (!ctx.session || !ctx.session.market) {
        await ctx.answerCbQuery('Диалог не активен. Введи /market.');
        return;
      }

      const categorySlug = ctx.match[1];
      const subSlugRaw = ctx.match[2];
      const subSlug = subSlugRaw === 'all' ? null : subSlugRaw;

      ctx.session.market.data.categoryId = categorySlug;
      ctx.session.market.data.subcategoryId = subSlug;
      ctx.session.market.step = 'show_ads';

      const categories = await fetchCategories();
      const rootCat = categories.find((c) => c.slug === categorySlug);
      if (!rootCat) {
        await ctx.answerCbQuery('Категория не найдена.');
        return;
      }

      let subcategoryName = null;
      if (subSlug) {
        const sub = (rootCat.subcategories || []).find((s) => s.slug === subSlug);
        if (!sub) {
          await ctx.answerCbQuery('Подкатегория не найдена.');
          return;
        }
        subcategoryName = sub.name;
      }

      await ctx.editMessageText(
        `Категория: ${rootCat.name}` +
          (subcategoryName ? ` → ${subcategoryName}` : '') +
          '\n\nПоказываю свежие объявления...'
      );

      await showMarketAds(ctx, {
        categoryName: rootCat.name,
        subcategoryName,
        categoryId: categorySlug,
        subcategoryId: subSlug,
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('market_subcat error:', error.response?.data || error.message);
      await ctx.reply('⚠️ Ошибка при выборе подкатегории. Попробуй ещё раз /market.');
    }
  });

  bot.launch();
  console.log('[bot] Bot launched');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  return bot;
}

module.exports = { startBot };
