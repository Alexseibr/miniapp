const baseBot = require('../bot/bot');
const favoritesCommand = require('./commands/favorites');
const notificationsCommand = require('./commands/notifications');

favoritesCommand(baseBot);
notificationsCommand(baseBot);

module.exports = { bot: baseBot };
