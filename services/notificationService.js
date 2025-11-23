// services/notificationService.js
import Favorite from '../models/Favorite.js';
import NotificationQueue from '../models/NotificationQueue.js';

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

export { handlePriceChange, handleStatusChange };
