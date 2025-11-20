import { Telegraf, Context } from 'telegraf';
import { MINIAPP_BASE_URL } from './config/miniapp';

export function getMainWebAppKeyboard() {
  if (!MINIAPP_BASE_URL) {
    return { inline_keyboard: [] };
  }

  return {
    inline_keyboard: [
      [
        {
          text: '🛒 Открыть маркетплейс',
          web_app: { url: `${MINIAPP_BASE_URL}?tgWebAppStartParam=market_all` },
        },
      ],
      [
        {
          text: '🌾 Фермерский маркет',
          web_app: { url: `${MINIAPP_BASE_URL}?tgWebAppStartParam=niche_farm` },
        },
      ],
      [
        {
          text: '🎨 Ремесленники / выпечка',
          web_app: { url: `${MINIAPP_BASE_URL}?tgWebAppStartParam=niche_crafts` },
        },
      ],
      [
        {
          text: '💐 Ярмарка 8 марта',
          web_app: { url: `${MINIAPP_BASE_URL}?tgWebAppStartParam=season_march8_tulips` },
        },
      ],
    ],
  } as const;
}

const bot = new Telegraf<Context>(process.env.BOT_TOKEN!);

bot.start((ctx) =>
  ctx.reply('👋 Добро пожаловать! Выберите раздел маркетплейса:', {
    reply_markup: getMainWebAppKeyboard(),
  })
);

bot.command('menu', (ctx) =>
  ctx.reply('📍 Главное меню:', {
    reply_markup: getMainWebAppKeyboard(),
  })
);

bot.launch();

export default bot;
