async function sendPriceStatusChangeNotifications(notifications = []) {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return;
  }

  const summary = notifications.map((entry) => ({
    telegramId: entry.user?.telegramId,
    priceChanged: entry.changes?.priceChanged || false,
    statusChanged: entry.changes?.statusChanged || false,
    oldPrice: entry.changes?.oldPrice,
    newPrice: entry.changes?.newPrice,
    oldStatus: entry.changes?.oldStatus,
    newStatus: entry.changes?.newStatus,
  }));

  console.log('Stub notifications to send:', summary);
}

module.exports = {
  sendPriceStatusChangeNotifications,
};
