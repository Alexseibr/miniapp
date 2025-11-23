import bot from '../bot/bot.js';

async function sendPriceStatusChangeNotifications(notifications = []) {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return;
  }

  for (const entry of notifications) {
    const telegramId = entry.user?.telegramId;
    if (!telegramId) {
      continue;
    }

    const payload = {
      adId: entry.ad?._id,
      title: entry.ad?.title,
      oldPrice: entry.changes?.oldPrice,
      newPrice: entry.changes?.newPrice,
      oldStatus: entry.changes?.oldStatus,
      newStatus: entry.changes?.newStatus,
    };

    if (typeof bot.sendFavoriteUpdateNotification === 'function') {
      await bot.sendFavoriteUpdateNotification(telegramId, payload);
    } else {
      console.log('Stub notification', { telegramId, ...payload });
    }
  }
}

export { sendPriceStatusChangeNotifications };
