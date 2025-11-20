import { Telegraf } from 'telegraf';
import { BOT_TOKEN } from './config/miniapp';
import { startHandler } from './handlers/start';
import { menuHandler } from './handlers/menu';
import { sellHandler } from './handlers/sell';
import { myAdsHandler } from './handlers/myAds';
import { favoritesHandler } from './handlers/favorites';

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN is required');
}

const bot = new Telegraf(BOT_TOKEN);

bot.start(startHandler);
bot.command('menu', menuHandler);
bot.command('sell', sellHandler);
bot.command('myads', myAdsHandler);
bot.command('favorites', favoritesHandler);

bot.on('message', menuHandler);

export const launchBot = async () => bot.launch();

launchBot().catch((err) => {
  console.error('Failed to launch bot', err);
});

export default bot;
