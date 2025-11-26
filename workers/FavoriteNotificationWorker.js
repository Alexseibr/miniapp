import cron from 'node-cron';
import Ad from '../models/Ad.js';
import Favorite from '../models/Favorite.js';
import { sendMessageToTelegramId } from '../bot/messenger.js';

class FavoriteNotificationWorker {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
  }

  start() {
    cron.schedule('*/5 * * * *', () => this.checkPriceChanges());
    
    cron.schedule('*/5 * * * *', () => this.checkStatusChanges());
    
    console.log('[FavoriteNotification] Started - checks every 5 minutes');
  }

  async checkPriceChanges() {
    if (this.isRunning) {
      console.log('[FavoriteNotification] Previous check still running, skipping...');
      return;
    }

    this.isRunning = true;
    this.lastRun = new Date();

    try {
      const adsWithPriceChange = await Ad.find({
        hasPriceChangeForNotifications: true,
        status: 'active',
      }).lean();

      console.log(`[FavoriteNotification] Found ${adsWithPriceChange.length} ads with price changes`);

      for (const ad of adsWithPriceChange) {
        try {
          await this.notifyFavoriteUsersAboutPriceChange(ad);
          
          await Ad.updateOne(
            { _id: ad._id },
            { $set: { hasPriceChangeForNotifications: false } }
          );
        } catch (error) {
          console.error(`[FavoriteNotification] Error processing ad ${ad._id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('[FavoriteNotification] checkPriceChanges error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async checkStatusChanges() {
    try {
      const adsWithStatusChange = await Ad.find({
        hasStatusChangeForNotifications: true,
        status: { $in: ['sold', 'archived', 'hidden', 'expired'] },
      }).lean();

      console.log(`[FavoriteNotification] Found ${adsWithStatusChange.length} ads with status changes`);

      for (const ad of adsWithStatusChange) {
        try {
          await this.notifyFavoriteUsersAboutStatusChange(ad);
          
          await Ad.updateOne(
            { _id: ad._id },
            { $set: { hasStatusChangeForNotifications: false } }
          );
        } catch (error) {
          console.error(`[FavoriteNotification] Error processing status change ${ad._id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('[FavoriteNotification] checkStatusChanges error:', error);
    }
  }

  async notifyFavoriteUsersAboutPriceChange(ad) {
    const favorites = await Favorite.find({
      adId: ad._id,
      notifyOnPriceChange: true,
    }).lean();

    if (favorites.length === 0) return;

    const lastPriceChange = ad.priceHistory?.[ad.priceHistory.length - 1];
    if (!lastPriceChange) return;

    const { oldPrice, newPrice } = lastPriceChange;
    const priceDirection = newPrice > oldPrice ? '📈' : '📉';
    const diffPercent = Math.round(((newPrice - oldPrice) / oldPrice) * 100);

    const message = `${priceDirection} *Изменилась цена!*\n\n` +
      `📦 ${ad.title}\n\n` +
      `Было: ${oldPrice.toLocaleString('ru-RU')} руб.\n` +
      `Стало: *${newPrice.toLocaleString('ru-RU')} руб.* (${diffPercent > 0 ? '+' : ''}${diffPercent}%)\n\n` +
      `👉 [Открыть товар](https://t.me/KetmarM_bot?startapp=ad_${ad._id})`;

    for (const fav of favorites) {
      try {
        await sendMessageToTelegramId(Number(fav.userTelegramId), message, { parse_mode: 'Markdown' });
        console.log(`[FavoriteNotification] Sent price change to ${fav.userTelegramId} for ad ${ad._id}`);
      } catch (error) {
        console.error(`[FavoriteNotification] Failed to send to ${fav.userTelegramId}:`, error.message);
      }
    }
  }

  async notifyFavoriteUsersAboutStatusChange(ad) {
    const favorites = await Favorite.find({
      adId: ad._id,
      notifyOnStatusChange: true,
    }).lean();

    if (favorites.length === 0) return;

    let statusMessage = '';
    let emoji = '📦';

    switch (ad.status) {
      case 'sold':
        emoji = '✅';
        statusMessage = 'Товар продан';
        break;
      case 'archived':
      case 'hidden':
        emoji = '⚠️';
        statusMessage = 'Товар снят с публикации';
        break;
      case 'expired':
        emoji = '⏰';
        statusMessage = 'Объявление истекло';
        break;
      default:
        statusMessage = 'Товар недоступен';
    }

    const message = `${emoji} *${statusMessage}*\n\n` +
      `📦 ${ad.title}\n` +
      `💰 ${ad.price?.toLocaleString('ru-RU') || 0} руб.\n\n` +
      `Товар из вашего избранного больше недоступен.`;

    for (const fav of favorites) {
      try {
        await sendMessageToTelegramId(Number(fav.userTelegramId), message, { parse_mode: 'Markdown' });
        console.log(`[FavoriteNotification] Sent status change to ${fav.userTelegramId} for ad ${ad._id}`);
      } catch (error) {
        console.error(`[FavoriteNotification] Failed to send status to ${fav.userTelegramId}:`, error.message);
      }
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
    };
  }
}

export default new FavoriteNotificationWorker();
