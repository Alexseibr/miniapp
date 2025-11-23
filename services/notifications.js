import mongoose from 'mongoose';
import Favorite from '../models/Favorite.js';
import { sendMessageToTelegramId } from '../bot/messenger.js';

async function notifySubscribers(adId, message) {
  if (!adId || !message) {
    return;
  }

  try {
    const adFilter = mongoose.isValidObjectId(adId) ? new mongoose.Types.ObjectId(adId) : adId;
    const favorites = await Favorite.find({ adId: adFilter }).select('userTelegramId');

    if (!favorites.length) {
      return;
    }

    for (const favorite of favorites) {
      const telegramId = Number(favorite.userTelegramId);
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

export { notifySubscribers };
