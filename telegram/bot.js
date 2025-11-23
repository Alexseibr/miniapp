import baseBot from '../bot/bot.js';
import favoritesCommand from './commands/favorites.js';
import notificationsCommand from './commands/notifications.js';

favoritesCommand(baseBot);
notificationsCommand(baseBot);

module.exports = { bot: baseBot };
