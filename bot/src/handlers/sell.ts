import { Context } from 'telegraf';
import { sellKeyboard } from '../keyboards/webappKeyboards';

export const sellHandler = async (ctx: Context) => {
  await ctx.reply('Откройте миниапп чтобы создать объявление', { reply_markup: sellKeyboard });
};
