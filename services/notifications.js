const User = require('../models/User');
const { sendMessageToTelegramId } = require('../bot/messenger');

async function notifySubscribers(adId, message) {
  if (!adId || !message) {
    return;
  }

  try {
    const users = await User.find({ favorites: adId }).select('telegramId');

    if (!users.length) {
      return;
    }

    for (const user of users) {
      const telegramId = Number(user.telegramId);
      if (!Number.isFinite(telegramId)) {
        continue;
      }

      try {
        await sendMessageToTelegramId(telegramId, message);
      } catch (error) {
        console.error('Failed to send notification', { telegramId, adId, error });
      }
    }
  } catch (error) {
    console.error('notifySubscribers error:', error);
  }
}

module.exports = {
  notifySubscribers,
};
