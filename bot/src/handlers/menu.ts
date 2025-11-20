import { Context } from 'telegraf';
import { startKeyboard } from '../keyboards/webappKeyboards';

export const menuHandler = async (ctx: Context) => {
  await ctx.reply('Выберите раздел маркетплейса:', { reply_markup: startKeyboard });
};
