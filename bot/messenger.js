const bot = require('./bot');

async function sendMessageToTelegramId(telegramId, text, extra = {}) {
  if (!bot || !bot.telegram) {
    console.warn('Bot instance is not ready to send messages');
    return null;
  }

  const normalizedId = Number(telegramId);
  if (!Number.isFinite(normalizedId)) {
    console.warn('Invalid telegramId for notification', telegramId);
    return null;
  }

  try {
    return await bot.telegram.sendMessage(normalizedId, text, extra);
  } catch (error) {
    console.error('Failed to send Telegram message', { telegramId: normalizedId, error });
    throw error;
  }
}

module.exports = {
  sendMessageToTelegramId,
};
