// services/notificationService.js
const Favorite = require('../models/Favorite');
const NotificationQueue = require('../models/NotificationQueue');

async function handlePriceChange(ad, oldPrice, newPrice) {
  const favorites = await Favorite.find({
    adId: ad._id,
    notifyOnPriceChange: true,
  }).lean();

  if (!favorites.length) return;

  const text = `📉 Объявление "${ad.title}" изменило цену: ${oldPrice} → ${newPrice}`;

  const docs = favorites.map((fav) => ({
    userTelegramId: fav.userTelegramId,
    adId: ad._id,
    type: 'price_change',
    text,
  }));

  await NotificationQueue.insertMany(docs);
}

async function handleStatusChange(ad, oldStatus, newStatus) {
  const favorites = await Favorite.find({
    adId: ad._id,
    notifyOnStatusChange: true,
  }).lean();

  if (!favorites.length) return;

  const text = `ℹ️ Объявление "${ad.title}" изменило статус: ${oldStatus} → ${newStatus}`;

  const docs = favorites.map((fav) => ({
    userTelegramId: fav.userTelegramId,
    adId: ad._id,
    type: 'status_change',
    text,
  }));

  await NotificationQueue.insertMany(docs);
}

module.exports = {
  handlePriceChange,
  handleStatusChange,
};
