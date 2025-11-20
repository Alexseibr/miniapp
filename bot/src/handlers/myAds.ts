import { Context } from 'telegraf';
import { MINIAPP_BASE_URL } from '../config/miniapp';

export const myAdsHandler = async (ctx: Context) => {
  const url = `${MINIAPP_BASE_URL}?tgWebAppStartParam=market_all#myads`;
  await ctx.reply('Ваши объявления доступны в миниапп:', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Мои объявления', web_app: { url } }]],
    },
  });
};
