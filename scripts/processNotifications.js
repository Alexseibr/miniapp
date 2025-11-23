require('dotenv/config');
import mongoose from 'mongoose';
import connectDB from '../services/db.js';
import AdChange from '../models/AdChange.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Ad from '../models/Ad.js';

async function processChanges() {
  await connectDB();

  const changes = await AdChange.find({ processed: false }).sort({ createdAt: 1 }).limit(200);

  for (const change of changes) {
    const users = await User.find({ 'favorites.adId': change.adId });
    const ad = await Ad.findById(change.adId);

    for (const user of users) {
      console.log(
        `[NOTIFY] user=${user.telegramId} ad=${change.adId} price ${change.oldPrice} -> ${change.newPrice} status ${change.oldStatus} -> ${change.newStatus}`
      );

      await Notification.create({
        userTelegramId: user.telegramId,
        adId: change.adId,
        type: change.newPrice != null && change.oldPrice != null && change.oldPrice !== change.newPrice
          ? 'price_change'
          : 'status_change',
        oldPrice: change.oldPrice,
        newPrice: change.newPrice,
        oldStatus: change.oldStatus,
        newStatus: change.newStatus,
      });

      user.favorites = (user.favorites || []).map((fav) => {
        if (fav.adId && fav.adId.toString() === change.adId.toString()) {
          return {
            ...fav,
            lastKnownPrice: change.newPrice ?? fav.lastKnownPrice,
            lastKnownStatus: change.newStatus ?? fav.lastKnownStatus,
          };
        }
        return fav;
      });
      await user.save();
    }

    change.processed = true;
    await change.save();
  }

  await mongoose.disconnect();
  console.log('Notifications processed');
}

processChanges().catch((err) => {
  console.error('processNotifications failed', err);
  mongoose.disconnect();
  process.exit(1);
});
