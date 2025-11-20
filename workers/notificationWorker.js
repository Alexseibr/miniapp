// workers/notificationWorker.js
const NotificationQueue = require('../models/NotificationQueue');
const { bot } = require('../telegram/bot');

async function processNotificationBatch(limit = 50) {
  const pending = await NotificationQueue.find({ status: 'pending' })
    .sort({ createdAt: 1 })
    .limit(limit);

  for (const item of pending) {
    try {
      await bot.telegram.sendMessage(item.userTelegramId, item.text, {
        parse_mode: 'HTML',
      });

      item.status = 'sent';
      item.sentAt = new Date();
      await item.save();
    } catch (err) {
      item.status = 'error';
      item.errorMessage = err.message;
      await item.save();
    }
  }
}

function startNotificationWorker() {
  setInterval(() => {
    processNotificationBatch().catch(console.error);
  }, 30 * 1000);
}

module.exports = {
  startNotificationWorker,
};
