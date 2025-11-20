import { Context } from 'telegraf';
import { startKeyboard } from '../keyboards/webappKeyboards';

export const startHandler = async (ctx: Context) => {
  await ctx.reply(
    'Добро пожаловать в Marketplace MiniApp! Выберите витрину или откройте маркетплейс.',
    {
      reply_markup: startKeyboard,
    }
  );
};
