import SearchAlert from '../models/SearchAlert.js';
import SearchLog from '../models/SearchLog.js';
import Ad from '../models/Ad.js';
import ngeohash from 'ngeohash';

const STOP_WORDS = new Set([
  'куплю', 'продам', 'ищу', 'нужен', 'нужна', 'нужно', 'срочно', 'недорого',
  'дёшево', 'дешево', 'бу', 'б/у', 'новый', 'новая', 'новое', 'хочу',
  'и', 'в', 'на', 'с', 'по', 'для', 'от', 'до', 'за', 'из', 'к', 'у', 'о',
]);

class SearchAlertService {
  static normalizeQuery(query) {
    if (!query) return '';
    
    return query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOP_WORDS.has(word))
      .join(' ');
  }

  static async createOrUpdateAlert(data) {
    const {
      telegramId,
      userId,
      sessionId,
      query,
      detectedCategoryId,
      lat,
      lng,
      radiusKm = 5,
      citySlug,
    } = data;
    
    const normalizedQuery = this.normalizeQuery(query);
    if (!normalizedQuery) {
      throw new Error('Пустой поисковый запрос');
    }
    
    const geoHash = lat && lng ? ngeohash.encode(lat, lng, 5) : null;
    
    const filter = {
      normalizedQuery,
      ...(telegramId ? { telegramId } : userId ? { userId } : { sessionId }),
    };
    
    const update = {
      query,
      normalizedQuery,
      detectedCategoryId: detectedCategoryId || null,
      radiusKm,
      citySlug: citySlug || null,
      isActive: true,
      updatedAt: new Date(),
    };
    
    if (lat && lng) {
      update.location = {
        type: 'Point',
        coordinates: [lng, lat],
      };
      update.geoHash = geoHash;
    }
    
    if (telegramId) update.telegramId = telegramId;
    if (userId) update.userId = userId;
    if (sessionId) update.sessionId = sessionId;
    
    const alert = await SearchAlert.findOneAndUpdate(
      filter,
      update,
      { upsert: true, new: true }
    );
    
    return alert;
  }

  static async getMyAlerts(telegramId, options = {}) {
    const { limit = 20, skip = 0, activeOnly = true } = options;
    
    const filter = { telegramId };
    if (activeOnly) {
      filter.isActive = true;
    }
    
    const alerts = await SearchAlert.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    return alerts;
  }

  static async deactivateAlert(alertId, telegramId) {
    const alert = await SearchAlert.findOneAndUpdate(
      { _id: alertId, telegramId },
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );
    
    return alert;
  }

  static async findMatchingAlerts(ad) {
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    
    const titleWords = this.normalizeQuery(ad.title || '').split(' ').filter(w => w.length > 2);
    const descWords = this.normalizeQuery(ad.description || '').split(' ').filter(w => w.length > 2);
    const allWords = [...new Set([...titleWords, ...descWords])];
    
    console.log('[SearchAlert] Looking for matches:', { 
      adTitle: ad.title, 
      titleWords,
      adLocation: ad.location?.geo?.coordinates 
    });
    
    if (allWords.length === 0 && !ad.categoryId) {
      console.log('[SearchAlert] No words or category to match');
      return [];
    }
    
    const matchConditions = [];
    
    if (ad.categoryId) {
      matchConditions.push({ detectedCategoryId: ad.categoryId });
    }
    if (ad.subcategoryId) {
      matchConditions.push({ detectedCategoryId: ad.subcategoryId });
    }
    
    if (allWords.length > 0) {
      const wordRegexes = allWords.slice(0, 5).map(word => new RegExp(word, 'i'));
      matchConditions.push({
        $or: wordRegexes.map(regex => ({ normalizedQuery: regex })),
      });
    }
    
    if (matchConditions.length === 0) {
      console.log('[SearchAlert] No match conditions generated');
      return [];
    }
    
    const filter = {
      isActive: true,
      $and: [
        {
          $or: [
            { notifiedAt: null },
            { notifiedAt: { $exists: false } },
            { notifiedAt: { $lt: oneDayAgo } },
          ],
        },
        {
          $or: matchConditions,
        },
      ],
    };
    
    let alerts = await SearchAlert.find(filter).limit(100).lean();
    console.log('[SearchAlert] Found alerts before geo filter:', alerts.length);
    
    if (ad.location?.geo?.coordinates || ad.geo?.coordinates) {
      const adCoords = ad.location?.geo?.coordinates || ad.geo?.coordinates;
      
      alerts = alerts.filter(alert => {
        if (!alert.location?.coordinates || alert.location.coordinates[0] === 0) {
          return true;
        }
        
        const distance = this.calculateDistance(
          adCoords[1], adCoords[0],
          alert.location.coordinates[1], alert.location.coordinates[0]
        );
        
        const maxRadius = alert.radiusKm || 30;
        const inRange = distance <= maxRadius;
        
        console.log('[SearchAlert] Distance check:', {
          alertQuery: alert.query,
          distance: distance.toFixed(1) + 'km',
          maxRadius,
          inRange
        });
        
        return inRange;
      });
    }
    
    console.log('[SearchAlert] Matched alerts after geo filter:', alerts.length);
    return alerts;
  }

  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  static async notifyMatchingUsers(ad, sendNotification) {
    const alerts = await this.findMatchingAlerts(ad);
    
    const results = [];
    
    for (const alert of alerts) {
      try {
        if (!alert.telegramId) continue;
        
        await SearchAlert.updateOne(
          { _id: alert._id },
          {
            notifiedAt: new Date(),
            lastMatchedAdId: ad._id,
            $inc: { notificationsCount: 1 },
          }
        );
        
        if (sendNotification) {
          const adLink = `https://t.me/KetmarM_bot?startapp=ad_${ad._id}`;
          
          await sendNotification(
            alert.telegramId,
            `🔔 <b>Появилось новое объявление!</b>\n\n` +
            `📦 "${ad.title}"\n` +
            `💰 ${ad.price || 0} руб.\n` +
            `${ad.city ? `📍 ${ad.city}` : ''}\n\n` +
            `Вы искали: "${alert.query}"\n\n` +
            `👉 <a href="${adLink}">Открыть объявление</a>`,
            'new_ad_match'
          );
        }
        
        results.push({
          alertId: alert._id,
          telegramId: alert.telegramId,
          query: alert.query,
        });
      } catch (error) {
        console.error(`[SearchAlertService] Error notifying user ${alert.telegramId}:`, error);
      }
    }
    
    return results;
  }

  static async autoCreateAlertOnZeroResults(searchLogId, telegramId) {
    const searchLog = await SearchLog.findById(searchLogId);
    if (!searchLog || searchLog.resultsCount > 0) {
      return null;
    }
    
    const alert = await this.createOrUpdateAlert({
      telegramId,
      query: searchLog.query,
      detectedCategoryId: searchLog.detectedCategoryId,
      lat: searchLog.location?.coordinates?.[1],
      lng: searchLog.location?.coordinates?.[0],
      radiusKm: searchLog.radiusKm || 5,
      citySlug: searchLog.citySlug,
    });
    
    await SearchLog.updateOne(
      { _id: searchLogId },
      { alertCreated: true }
    );
    
    return alert;
  }
}

export default SearchAlertService;
