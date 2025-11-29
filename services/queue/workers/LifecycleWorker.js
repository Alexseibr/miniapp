/**
 * LifecycleWorker - Manages ad lifecycle events
 * Handles expiration, republishing, reminders, cleanup
 */

import { BaseWorker } from './BaseWorker.js';
import { QUEUES } from '../config.js';
import Ad from '../../../models/Ad.js';

class LifecycleWorker extends BaseWorker {
  constructor() {
    super(QUEUES.LIFECYCLE, async (job) => this.processLifecycleEvent(job));
    this.notificationCallback = null;
  }

  /**
   * Set notification callback for Telegram
   */
  setNotificationCallback(callback) {
    this.notificationCallback = callback;
  }

  /**
   * Process lifecycle event
   */
  async processLifecycleEvent(job) {
    const { action, adId, data } = job.data;

    switch (action) {
      case 'check-expiration':
        return this._checkExpiration(adId, data);
      
      case 'expire-ad':
        return this._expireAd(adId, data);
      
      case 'republish-ad':
        return this._republishAd(adId, data);
      
      case 'send-reminder':
        return this._sendReminder(adId, data);
      
      case 'cleanup-expired':
        return this._cleanupExpired(data);
      
      case 'extend-ad':
        return this._extendAd(adId, data);
      
      default:
        throw new Error(`Unknown lifecycle action: ${action}`);
    }
  }

  /**
   * Check if ad should expire
   */
  async _checkExpiration(adId, data) {
    const ad = await Ad.findById(adId);
    
    if (!ad) {
      return { adId, action: 'skip', reason: 'Ad not found' };
    }

    if (ad.status !== 'active') {
      return { adId, action: 'skip', reason: 'Ad not active' };
    }

    const now = new Date();
    const expiresAt = ad.expiresAt || new Date(ad.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (now >= expiresAt) {
      ad.status = 'expired';
      await ad.save();
      
      await this._notifySeller(ad.sellerTelegramId, 
        `⏰ Ваше объявление "${ad.title}" истекло.\n\nПереопубликуйте его, чтобы оно снова появилось в поиске.`
      );

      return { adId, action: 'expired' };
    }

    const daysLeft = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));
    
    if (daysLeft <= 3 && !ad.expirationReminderSent) {
      await this._notifySeller(ad.sellerTelegramId,
        `⚠️ Ваше объявление "${ad.title}" истекает через ${daysLeft} дн.\n\nПродлите его, чтобы не потерять видимость.`
      );
      
      ad.expirationReminderSent = true;
      await ad.save();

      return { adId, action: 'reminder-sent', daysLeft };
    }

    return { adId, action: 'ok', daysLeft };
  }

  /**
   * Expire ad immediately
   */
  async _expireAd(adId, data) {
    const result = await Ad.findByIdAndUpdate(
      adId,
      { 
        status: 'expired',
        expiredAt: new Date(),
      },
      { new: true }
    );

    if (result) {
      await this._notifySeller(result.sellerTelegramId,
        `📋 Объявление "${result.title}" снято с публикации.`
      );
    }

    return { adId, expired: !!result };
  }

  /**
   * Republish ad
   */
  async _republishAd(adId, data) {
    const ad = await Ad.findById(adId);
    
    if (!ad) {
      return { adId, action: 'fail', reason: 'Ad not found' };
    }

    const ttlDays = data.ttlDays || 30;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    ad.status = 'active';
    ad.publishedAt = new Date();
    ad.expiresAt = expiresAt;
    ad.expirationReminderSent = false;
    ad.republishCount = (ad.republishCount || 0) + 1;
    
    await ad.save();

    await this._notifySeller(ad.sellerTelegramId,
      `✅ Объявление "${ad.title}" переопубликовано!\n\nОно будет активно ещё ${ttlDays} дней.`
    );

    return { adId, action: 'republished', expiresAt };
  }

  /**
   * Send reminder to seller
   */
  async _sendReminder(adId, data) {
    const ad = await Ad.findById(adId);
    
    if (!ad || !ad.sellerTelegramId) {
      return { adId, action: 'skip', reason: 'No seller to notify' };
    }

    const { type, message } = data;

    await this._notifySeller(ad.sellerTelegramId, message);

    return { adId, action: 'reminder-sent', type };
  }

  /**
   * Cleanup expired ads
   */
  async _cleanupExpired(data) {
    const { olderThanDays = 90, limit = 100 } = data;
    
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await Ad.updateMany(
      {
        status: 'expired',
        expiredAt: { $lt: cutoffDate },
      },
      {
        $set: { status: 'archived' },
      }
    );

    return { archived: result.modifiedCount, cutoffDate };
  }

  /**
   * Extend ad expiration
   */
  async _extendAd(adId, data) {
    const { additionalDays = 14 } = data;
    
    const ad = await Ad.findById(adId);
    
    if (!ad) {
      return { adId, action: 'fail', reason: 'Ad not found' };
    }

    const currentExpiry = ad.expiresAt || new Date();
    const newExpiry = new Date(currentExpiry.getTime() + additionalDays * 24 * 60 * 60 * 1000);

    ad.expiresAt = newExpiry;
    ad.expirationReminderSent = false;
    await ad.save();

    return { adId, action: 'extended', newExpiresAt: newExpiry };
  }

  /**
   * Send notification to seller via Telegram
   */
  async _notifySeller(telegramId, message) {
    if (!telegramId || !this.notificationCallback) {
      return;
    }

    try {
      await this.notificationCallback(telegramId, message, 'lifecycle');
    } catch (error) {
      console.error('[LifecycleWorker] Failed to notify seller:', error.message);
    }
  }
}

export const lifecycleWorker = new LifecycleWorker();
export default lifecycleWorker;
