import cron from 'node-cron';
import Ad from '../models/Ad.js';
import User from '../models/User.js';
import Favorite from '../models/Favorite.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import { sendMessageToTelegramId } from '../bot/messenger.js';

const PRICE_CHANGE_THRESHOLD = 3;
const MIN_HOURS_BETWEEN_PRICE_NOTIFICATIONS = 12;
const SIMILAR_ADS_RADIUS_KM = 3;
const MIN_SIMILAR_ADS_FOR_NOTIFICATION = 2;

class FavoriteNotificationWorker {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.lastNotificationTime = new Map();
  }

  start() {
    cron.schedule('*/5 * * * *', () => this.checkPriceChanges());
    cron.schedule('*/5 * * * *', () => this.checkStatusChanges());
    cron.schedule('*/30 * * * *', () => this.checkEditedAds());
    cron.schedule('0 10,18 * * *', () => this.checkSimilarAdsNearby());
    cron.schedule('0 12 * * *', () => this.sendSellerNudges());
    
    console.log('[FavoriteNotification] Started - smart notifications enabled');
    console.log('[FavoriteNotification] Price/status checks every 5 min');
    console.log('[FavoriteNotification] Similar ads check at 10:00 and 18:00');
    console.log('[FavoriteNotification] Seller nudges at 12:00');
  }

  async getUserSegment(telegramId) {
    try {
      const lastActivity = await AnalyticsEvent.findOne({ 
        sellerTelegramId: telegramId 
      }).sort({ timestamp: -1 });

      if (!lastActivity) return 'C';

      const daysSinceActive = (Date.now() - new Date(lastActivity.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceActive <= 2) return 'A';
      if (daysSinceActive <= 30) return 'B';
      return 'C';
    } catch (error) {
      return 'C';
    }
  }

  shouldNotifyUser(segment, notificationType) {
    switch (notificationType) {
      case 'price_change':
      case 'status_change':
        return segment === 'A' || segment === 'B';
      case 'similar_ads':
        return segment === 'A' || segment === 'B';
      case 'ad_edited':
        return segment === 'A';
      case 'monthly_summary':
        return segment === 'C';
      default:
        return segment === 'A';
    }
  }

  canSendNotification(telegramId, adId, type) {
    const key = `${telegramId}:${adId}:${type}`;
    const lastTime = this.lastNotificationTime.get(key);
    
    if (!lastTime) return true;
    
    const hoursSinceLast = (Date.now() - lastTime) / (1000 * 60 * 60);
    
    if (type === 'price_change') {
      return hoursSinceLast >= MIN_HOURS_BETWEEN_PRICE_NOTIFICATIONS;
    }
    if (type === 'ad_edited') {
      return hoursSinceLast >= 24;
    }
    
    return hoursSinceLast >= 1;
  }

  markNotificationSent(telegramId, adId, type) {
    const key = `${telegramId}:${adId}:${type}`;
    this.lastNotificationTime.set(key, Date.now());
  }

  async checkPriceChanges() {
    if (this.isRunning) return;
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
          console.error(`[FavoriteNotification] Error processing status ${ad._id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('[FavoriteNotification] checkStatusChanges error:', error);
    }
  }

  async checkEditedAds() {
    try {
      const recentlyEdited = await Ad.find({
        status: 'active',
        updatedAt: { 
          $gte: new Date(Date.now() - 30 * 60 * 1000),
          $lte: new Date(Date.now() - 5 * 60 * 1000),
        },
      }).lean();

      for (const ad of recentlyEdited) {
        try {
          await this.notifyFavoriteUsersAboutEdit(ad);
        } catch (error) {
          console.error(`[FavoriteNotification] Error notifying edit ${ad._id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('[FavoriteNotification] checkEditedAds error:', error);
    }
  }

  async checkSimilarAdsNearby() {
    try {
      console.log('[FavoriteNotification] Checking similar ads nearby...');

      const usersWithFavorites = await Favorite.aggregate([
        { $group: { _id: '$userTelegramId', count: { $sum: 1 } } },
        { $match: { count: { $gte: 1 } } },
      ]);

      for (const user of usersWithFavorites) {
        try {
          const segment = await this.getUserSegment(user._id);
          if (!this.shouldNotifyUser(segment, 'similar_ads')) continue;

          await this.findAndNotifySimilarAds(user._id);
        } catch (error) {
          console.error(`[FavoriteNotification] Error checking similar for ${user._id}:`, error.message);
        }
      }
    } catch (error) {
      console.error('[FavoriteNotification] checkSimilarAdsNearby error:', error);
    }
  }

  async findAndNotifySimilarAds(telegramId) {
    const favorites = await Favorite.find({ userTelegramId: String(telegramId) });
    if (!favorites.length) return;

    const favAds = await Ad.find({ 
      _id: { $in: favorites.map(f => f.adId) } 
    }).lean();

    const categoryIds = [...new Set(favAds.map(a => a.categoryId).filter(Boolean))];
    if (!categoryIds.length) return;

    const userLocation = favAds.find(a => a.location?.lat)?.location;
    if (!userLocation) return;

    const earthRadiusKm = 6371;
    const latDelta = (SIMILAR_ADS_RADIUS_KM / earthRadiusKm) * (180 / Math.PI);
    const lngDelta = (SIMILAR_ADS_RADIUS_KM / earthRadiusKm) * (180 / Math.PI) / Math.cos(userLocation.lat * Math.PI / 180);

    const recentSimilarAds = await Ad.countDocuments({
      _id: { $nin: favorites.map(f => f.adId) },
      status: 'active',
      moderationStatus: 'approved',
      categoryId: { $in: categoryIds },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      'location.lat': { $gte: userLocation.lat - latDelta, $lte: userLocation.lat + latDelta },
      'location.lng': { $gte: userLocation.lng - lngDelta, $lte: userLocation.lng + lngDelta },
    });

    if (recentSimilarAds >= MIN_SIMILAR_ADS_FOR_NOTIFICATION) {
      if (!this.canSendNotification(telegramId, 'similar', 'similar_ads')) return;

      const message = `🎯 *Рядом появились похожие товары!*\n\n` +
        `За последние 24 часа появилось ${recentSimilarAds} новых объявлений в интересующих вас категориях.\n\n` +
        `👉 [Посмотреть в избранном](https://t.me/KetmarM_bot?startapp=favorites)`;

      try {
        await sendMessageToTelegramId(Number(telegramId), message, { parse_mode: 'Markdown' });
        this.markNotificationSent(telegramId, 'similar', 'similar_ads');
        console.log(`[FavoriteNotification] Sent similar ads notification to ${telegramId}`);
      } catch (error) {
        console.error(`[FavoriteNotification] Failed to send similar: ${error.message}`);
      }
    }
  }

  async sendSellerNudges() {
    try {
      console.log('[FavoriteNotification] Sending seller nudges...');

      const staleAds = await Ad.find({
        status: 'active',
        updatedAt: { $lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        favoritesCount: { $gte: 1 },
      }).lean();

      for (const ad of staleAds) {
        try {
          const watchersCount = ad.favoritesCount || 0;
          if (watchersCount < 1) continue;

          const message = `💡 *Подсказка продавца*\n\n` +
            `Ваш товар «${ad.title}» в избранном у ${watchersCount} ${this.pluralize(watchersCount, 'человека', 'человек', 'человек')}!\n\n` +
            `Обновите цену или описание для повышения интереса покупателей.\n\n` +
            `👉 [Редактировать](https://t.me/KetmarM_bot?startapp=ad_${ad._id})`;

          await sendMessageToTelegramId(Number(ad.sellerTelegramId), message, { parse_mode: 'Markdown' });
          console.log(`[FavoriteNotification] Sent nudge to seller ${ad.sellerTelegramId}`);
        } catch (error) {
          console.error(`[FavoriteNotification] Failed to send nudge: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('[FavoriteNotification] sendSellerNudges error:', error);
    }
  }

  pluralize(n, one, few, many) {
    if (n % 10 === 1 && n % 100 !== 11) return one;
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return few;
    return many;
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
    const changePercent = Math.abs(Math.round(((newPrice - oldPrice) / oldPrice) * 100));

    if (changePercent < PRICE_CHANGE_THRESHOLD) {
      console.log(`[FavoriteNotification] Price change ${changePercent}% < threshold, skipping`);
      return;
    }

    const priceDirection = newPrice < oldPrice ? '📉' : '📈';
    const changeText = newPrice < oldPrice ? 'снизилась' : 'выросла';

    const message = `${priceDirection} *Цена ${changeText}!*\n\n` +
      `📦 ${ad.title}\n\n` +
      `Было: ${oldPrice.toLocaleString('ru-RU')} руб.\n` +
      `Стало: *${newPrice.toLocaleString('ru-RU')} руб.* (${newPrice < oldPrice ? '-' : '+'}${changePercent}%)\n\n` +
      `👉 [Открыть товар](https://t.me/KetmarM_bot?startapp=ad_${ad._id})`;

    for (const fav of favorites) {
      try {
        const segment = await this.getUserSegment(fav.userTelegramId);
        if (!this.shouldNotifyUser(segment, 'price_change')) continue;
        if (!this.canSendNotification(fav.userTelegramId, ad._id.toString(), 'price_change')) continue;

        await sendMessageToTelegramId(Number(fav.userTelegramId), message, { parse_mode: 'Markdown' });
        this.markNotificationSent(fav.userTelegramId, ad._id.toString(), 'price_change');
        console.log(`[FavoriteNotification] Sent price change to ${fav.userTelegramId}`);
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
        console.log(`[FavoriteNotification] Sent status change to ${fav.userTelegramId}`);
      } catch (error) {
        console.error(`[FavoriteNotification] Failed to send status to ${fav.userTelegramId}:`, error.message);
      }
    }
  }

  async notifyFavoriteUsersAboutEdit(ad) {
    const favorites = await Favorite.find({
      adId: ad._id,
      notifyOnPriceChange: true,
    }).lean();

    if (favorites.length === 0) return;

    const message = `✏️ *Объявление обновлено*\n\n` +
      `📦 ${ad.title}\n` +
      `💰 ${ad.price?.toLocaleString('ru-RU') || 0} руб.\n\n` +
      `Продавец обновил информацию о товаре.\n\n` +
      `👉 [Посмотреть изменения](https://t.me/KetmarM_bot?startapp=ad_${ad._id})`;

    for (const fav of favorites) {
      try {
        const segment = await this.getUserSegment(fav.userTelegramId);
        if (!this.shouldNotifyUser(segment, 'ad_edited')) continue;
        if (!this.canSendNotification(fav.userTelegramId, ad._id.toString(), 'ad_edited')) continue;

        await sendMessageToTelegramId(Number(fav.userTelegramId), message, { parse_mode: 'Markdown' });
        this.markNotificationSent(fav.userTelegramId, ad._id.toString(), 'ad_edited');
        console.log(`[FavoriteNotification] Sent edit notification to ${fav.userTelegramId}`);
      } catch (error) {
        console.error(`[FavoriteNotification] Failed to send edit to ${fav.userTelegramId}:`, error.message);
      }
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      notificationCacheSize: this.lastNotificationTime.size,
    };
  }
}

export default new FavoriteNotificationWorker();
