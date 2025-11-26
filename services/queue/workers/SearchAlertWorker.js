/**
 * SearchAlertWorker - Processes search alerts for buyers
 * Notifies users when searched items become available
 */

import { BaseWorker } from './BaseWorker.js';
import { QUEUES } from '../config.js';
import SearchAlert from '../../../models/SearchAlert.js';
import Ad from '../../../models/Ad.js';

class SearchAlertWorker extends BaseWorker {
  constructor() {
    super(QUEUES.SEARCH_ALERTS, async (job) => this.processAlert(job));
    this.notificationCallback = null;
  }

  /**
   * Set notification callback
   */
  setNotificationCallback(callback) {
    this.notificationCallback = callback;
  }

  /**
   * Process search alert
   */
  async processAlert(job) {
    const { type, data } = job.data;

    switch (type) {
      case 'new-ad-check':
        return this._checkNewAdAgainstAlerts(data);
      
      case 'user-alert-match':
        return this._notifyUserOfMatch(data);
      
      case 'bulk-scan':
        return this._bulkScanAlerts(data);
      
      case 'cleanup':
        return this._cleanupOldAlerts(data);
      
      default:
        throw new Error(`Unknown alert type: ${type}`);
    }
  }

  /**
   * Check if new ad matches any search alerts
   */
  async _checkNewAdAgainstAlerts(data) {
    const { adId } = data;
    
    const ad = await Ad.findById(adId);
    if (!ad || ad.status !== 'active') {
      return { adId, matches: 0, reason: 'Ad not active' };
    }

    const keywords = this._extractKeywords(ad.title, ad.description);
    const categoryId = ad.category;
    const location = ad.location?.coordinates;

    const matchingAlerts = await SearchAlert.find({
      isActive: true,
      notifiedAt: null,
      $or: [
        { keywords: { $in: keywords } },
        { categoryId: categoryId },
      ],
    }).limit(100);

    let matchCount = 0;
    
    for (const alert of matchingAlerts) {
      const isMatch = this._checkAlertMatch(alert, ad, keywords);
      
      if (isMatch) {
        await this._sendAlertNotification(alert, ad);
        matchCount++;
      }
    }

    return { adId, matches: matchCount };
  }

  /**
   * Check if alert matches ad
   */
  _checkAlertMatch(alert, ad, adKeywords) {
    if (alert.keywords && alert.keywords.length > 0) {
      const hasKeywordMatch = alert.keywords.some(kw => 
        adKeywords.includes(kw.toLowerCase())
      );
      if (!hasKeywordMatch) return false;
    }

    if (alert.categoryId && String(alert.categoryId) !== String(ad.category)) {
      return false;
    }

    if (alert.maxPrice && ad.price > alert.maxPrice) {
      return false;
    }

    if (alert.minPrice && ad.price < alert.minPrice) {
      return false;
    }

    if (alert.location && ad.location?.coordinates) {
      const distance = this._calculateDistance(
        alert.location.coordinates,
        ad.location.coordinates
      );
      const maxRadius = alert.radiusKm || 50;
      if (distance > maxRadius) return false;
    }

    return true;
  }

  /**
   * Send notification for matching alert
   */
  async _sendAlertNotification(alert, ad) {
    if (!alert.userTelegramId || !this.notificationCallback) {
      return;
    }

    const message = `🔔 <b>Найден товар по вашему запросу!</b>\n\n` +
      `📦 ${ad.title}\n` +
      `💰 ${ad.price ? ad.price.toLocaleString() + ' руб.' : 'Цена не указана'}\n` +
      `📍 ${ad.location?.city || 'Местоположение не указано'}\n\n` +
      `Вы искали: "${alert.query || alert.keywords?.join(', ')}"`;

    try {
      await this.notificationCallback(alert.userTelegramId, message, 'search-alert');
      
      await SearchAlert.findByIdAndUpdate(alert._id, {
        notifiedAt: new Date(),
        matchedAdId: ad._id,
      });
    } catch (error) {
      console.error('[SearchAlertWorker] Failed to send notification:', error.message);
    }
  }

  /**
   * Notify user directly of a match
   */
  async _notifyUserOfMatch(data) {
    const { alertId, adId } = data;

    const [alert, ad] = await Promise.all([
      SearchAlert.findById(alertId),
      Ad.findById(adId),
    ]);

    if (!alert || !ad) {
      return { success: false, reason: 'Alert or Ad not found' };
    }

    await this._sendAlertNotification(alert, ad);

    return { success: true, alertId, adId };
  }

  /**
   * Bulk scan all active alerts
   */
  async _bulkScanAlerts(data) {
    const { limit = 1000 } = data;

    const alerts = await SearchAlert.find({
      isActive: true,
      notifiedAt: null,
    }).limit(limit);

    let processed = 0;
    let matched = 0;

    for (const alert of alerts) {
      const matchingAd = await this._findMatchingAd(alert);
      
      if (matchingAd) {
        await this._sendAlertNotification(alert, matchingAd);
        matched++;
      }
      
      processed++;
    }

    return { processed, matched };
  }

  /**
   * Find matching ad for alert
   */
  async _findMatchingAd(alert) {
    const query = {
      status: 'active',
      createdAt: { $gt: alert.createdAt },
    };

    if (alert.categoryId) {
      query.category = alert.categoryId;
    }

    if (alert.maxPrice) {
      query.price = { $lte: alert.maxPrice };
    }

    if (alert.keywords && alert.keywords.length > 0) {
      const keywordRegex = alert.keywords.map(k => new RegExp(k, 'i'));
      query.$or = [
        { title: { $in: keywordRegex } },
        { description: { $in: keywordRegex } },
      ];
    }

    return Ad.findOne(query).sort({ createdAt: -1 });
  }

  /**
   * Cleanup old fulfilled alerts
   */
  async _cleanupOldAlerts(data) {
    const { olderThanDays = 30 } = data;
    
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await SearchAlert.deleteMany({
      $or: [
        { notifiedAt: { $lt: cutoffDate } },
        { createdAt: { $lt: cutoffDate }, isActive: false },
      ],
    });

    return { deleted: result.deletedCount };
  }

  /**
   * Extract keywords from text
   */
  _extractKeywords(title, description) {
    const text = `${title || ''} ${description || ''}`.toLowerCase();
    const words = text.split(/\s+/).filter(w => w.length > 2);
    return [...new Set(words)];
  }

  /**
   * Calculate distance between two points (km)
   */
  _calculateDistance(coords1, coords2) {
    const [lng1, lat1] = coords1;
    const [lng2, lat2] = coords2;
    
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }
}

export const searchAlertWorker = new SearchAlertWorker();
export default searchAlertWorker;
