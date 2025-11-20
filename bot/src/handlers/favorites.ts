import { Context } from 'telegraf';
import { favoritesKeyboard } from '../keyboards/webappKeyboards';

export const favoritesHandler = async (ctx: Context) => {
  await ctx.reply('Откройте избранное в миниапп', { reply_markup: favoritesKeyboard });
};
