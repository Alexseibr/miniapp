import mongoose from 'mongoose';
import UserTwin from '../models/UserTwin.js';
import Ad from '../models/Ad.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import { sendMessageToTelegramId } from '../bot/messenger.js';
import smartSearch from './SmartSearchService.js';
import { haversineDistanceKm } from '../utils/haversine.js';

const EARTH_RADIUS_KM = 6371;

class DigitalTwinService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 60000;
    this.smartSearch = smartSearch;
  }

  getCacheKey(method, params) {
    return `${method}:${JSON.stringify(params)}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
    if (this.cache.size > 500) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  async getTwin(userId, telegramId = null) {
    if (!userId && !telegramId) {
      throw new Error('userId or telegramId required');
    }

    if (userId) {
      return UserTwin.getOrCreate(userId, telegramId);
    }

    let twin = await UserTwin.findByTelegramId(telegramId);
    if (!twin) {
      const user = await User.findOne({ telegramId });
      if (user) {
        twin = await UserTwin.getOrCreate(user._id, telegramId);
      } else {
        throw new Error('User not found');
      }
    }
    return twin;
  }

  async trackEvent(userId, event) {
    try {
      const twin = await this.getTwin(userId);

      twin.addHistoryEvent(event.type, {
        query: event.query,
        adId: event.adId,
        categoryId: event.categoryId,
      });

      const weightBoost = {
        search: 1,
        view: 2,
        favorite: 5,
        contact_click: 10,
        purchase: 20,
      }[event.type] || 1;

      if (event.categoryId || event.query) {
        twin.addInterest(event.categoryId, event.query, event.tags || [], weightBoost);
      }

      await twin.save();
      return twin;
    } catch (error) {
      console.error('[DigitalTwin] trackEvent error:', error);
      throw error;
    }
  }

  async addWatchItem(userId, payload) {
    const twin = await this.getTwin(userId);

    const watchItem = {
      title: payload.title,
      query: payload.query || payload.title,
      categoryId: payload.categoryId,
      tags: payload.tags || [],
      maxPrice: payload.maxPrice,
      minPrice: payload.minPrice,
      radiusKm: payload.radiusKm || twin.preferences.maxRadiusKmDefault || 10,
      onlyNearby: payload.onlyNearby || false,
      notifyOnNew: payload.notifyOnNew !== false,
      notifyOnPriceDrop: payload.notifyOnPriceDrop !== false,
      notifyOnFirstMatch: payload.notifyOnFirstMatch || false,
      isActive: true,
      createdAt: new Date(),
    };

    twin.watchItems.push(watchItem);

    twin.addInterest(payload.categoryId, payload.query || payload.title, payload.tags || [], 5);

    await twin.save();

    const addedItem = twin.watchItems[twin.watchItems.length - 1];
    return addedItem;
  }

  async updateWatchItem(userId, watchItemId, updates) {
    const twin = await this.getTwin(userId);

    const watchItem = twin.watchItems.id(watchItemId);
    if (!watchItem) {
      throw new Error('WatchItem not found');
    }

    const allowedUpdates = [
      'title', 'query', 'categoryId', 'tags', 'maxPrice', 'minPrice',
      'radiusKm', 'onlyNearby', 'notifyOnNew', 'notifyOnPriceDrop',
      'notifyOnFirstMatch', 'isActive'
    ];

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        watchItem[field] = updates[field];
      }
    });

    await twin.save();
    return watchItem;
  }

  async toggleWatchItem(userId, watchItemId, isActive) {
    return this.updateWatchItem(userId, watchItemId, { isActive });
  }

  async deleteWatchItem(userId, watchItemId) {
    const twin = await this.getTwin(userId);

    const watchItem = twin.watchItems.id(watchItemId);
    if (!watchItem) {
      throw new Error('WatchItem not found');
    }

    twin.watchItems.pull(watchItemId);
    await twin.save();

    return { success: true };
  }

  async getWatchItems(userId) {
    const twin = await this.getTwin(userId);
    return twin.watchItems;
  }

  async getActiveWatchItems(userId) {
    const twin = await this.getTwin(userId);
    return twin.getActiveWatchItems();
  }

  async updatePreferences(userId, preferences) {
    const twin = await this.getTwin(userId);

    const allowedPrefs = [
      'maxRadiusKmDefault', 'favoriteLocations', 'priceSensitivity',
      'notificationsEnabled', 'quietHoursStart', 'quietHoursEnd'
    ];

    allowedPrefs.forEach(field => {
      if (preferences[field] !== undefined) {
        twin.preferences[field] = preferences[field];
      }
    });

    await twin.save();
    return twin.preferences;
  }

  async getAISummary(userId) {
    const twin = await this.getTwin(userId);

    if (twin.aiSummary && twin.aiSummaryUpdatedAt) {
      const hoursSinceUpdate = (Date.now() - twin.aiSummaryUpdatedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceUpdate < 24) {
        return twin.aiSummary;
      }
    }

    const summary = await this.generateAISummary(twin);
    twin.aiSummary = summary;
    twin.aiSummaryUpdatedAt = new Date();
    await twin.save();

    return summary;
  }

  async generateAISummary(twin) {
    const topInterests = twin.interests.slice(0, 5);

    if (topInterests.length === 0) {
      return 'Вы пока не искали товары. Начните поиск, чтобы ассистент узнал ваши предпочтения!';
    }

    const categoryIds = topInterests.map(i => i.categoryId).filter(Boolean);
    const categories = await Category.find({ _id: { $in: categoryIds } }).select('name');
    const categoryMap = {};
    categories.forEach(c => { categoryMap[c._id.toString()] = c.name; });

    const interestNames = topInterests.map(i => {
      if (i.categoryId && categoryMap[i.categoryId.toString()]) {
        return categoryMap[i.categoryId.toString()];
      }
      return i.query;
    }).filter(Boolean);

    const watchItemsCount = twin.watchItems.filter(w => w.isActive).length;
    const recentHistory = twin.history.slice(0, 10);
    const viewCount = recentHistory.filter(h => h.type === 'view').length;
    const searchCount = recentHistory.filter(h => h.type === 'search').length;

    let summary = `Вы чаще всего ищете: ${interestNames.join(', ')}.`;

    if (twin.preferences.maxRadiusKmDefault) {
      summary += ` Предпочтительный радиус поиска: ${twin.preferences.maxRadiusKmDefault} км.`;
    }

    if (watchItemsCount > 0) {
      summary += ` У вас ${watchItemsCount} активных желаний.`;
    }

    if (viewCount > 5) {
      summary += ` Активно просматриваете товары.`;
    }

    const priceSensitivityMsg = {
      high: 'Вы следите за ценами и ждёте скидок.',
      medium: 'Вы ищете баланс цены и качества.',
      low: 'Цена для вас не главный критерий.',
    }[twin.preferences.priceSensitivity];

    if (priceSensitivityMsg) {
      summary += ` ${priceSensitivityMsg}`;
    }

    return summary;
  }

  async getSuggestions(userId, geo = {}) {
    const twin = await this.getTwin(userId);

    const suggestions = [];
    const { lat, lng, radiusKm = twin.preferences.maxRadiusKmDefault || 10 } = geo;

    const topInterests = twin.interests.slice(0, 3);

    for (const interest of topInterests) {
      const matchStage = {
        status: 'active',
        moderationStatus: 'approved',
      };

      if (interest.categoryId) {
        matchStage.categoryId = interest.categoryId;
      } else if (interest.query) {
        matchStage.$or = [
          { title: { $regex: interest.query, $options: 'i' } },
          { description: { $regex: interest.query, $options: 'i' } },
        ];
      }

      if (lat && lng) {
        matchStage.location = {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusKm / EARTH_RADIUS_KM],
          },
        };
      }

      const ads = await Ad.find(matchStage)
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      ads.forEach(ad => {
        let distanceKm = null;
        if (lat && lng && ad.location?.lat && ad.location?.lng) {
          distanceKm = haversineDistanceKm(lat, lng, ad.location.lat, ad.location.lng);
        }

        suggestions.push({
          ad,
          distanceKm: distanceKm ? Number(distanceKm.toFixed(2)) : null,
          reason: interest.query
            ? `Вы искали "${interest.query}"`
            : 'На основе ваших интересов',
          type: 'interest_match',
        });
      });
    }

    for (const watchItem of twin.getActiveWatchItems()) {
      const matchStage = {
        status: 'active',
        moderationStatus: 'approved',
      };

      if (watchItem.categoryId) {
        matchStage.categoryId = watchItem.categoryId;
      }

      if (watchItem.query) {
        matchStage.$or = [
          { title: { $regex: watchItem.query, $options: 'i' } },
          { description: { $regex: watchItem.query, $options: 'i' } },
        ];
      }

      if (watchItem.maxPrice) {
        matchStage.price = { ...matchStage.price, $lte: watchItem.maxPrice };
      }
      if (watchItem.minPrice) {
        matchStage.price = { ...matchStage.price, $gte: watchItem.minPrice };
      }

      const watchRadius = watchItem.radiusKm || radiusKm;
      if (lat && lng && watchItem.onlyNearby) {
        matchStage.location = {
          $geoWithin: {
            $centerSphere: [[lng, lat], watchRadius / EARTH_RADIUS_KM],
          },
        };
      }

      const ads = await Ad.find(matchStage)
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();

      ads.forEach(ad => {
        let distanceKm = null;
        if (lat && lng && ad.location?.lat && ad.location?.lng) {
          distanceKm = haversineDistanceKm(lat, lng, ad.location.lat, ad.location.lng);
        }

        suggestions.push({
          ad,
          distanceKm: distanceKm ? Number(distanceKm.toFixed(2)) : null,
          reason: `По вашему желанию "${watchItem.title}"`,
          type: 'watchitem_match',
          watchItemId: watchItem._id,
        });
      });
    }

    const uniqueAds = new Map();
    suggestions.forEach(s => {
      const adId = s.ad._id.toString();
      if (!uniqueAds.has(adId)) {
        uniqueAds.set(adId, s);
      }
    });

    const uniqueSuggestions = Array.from(uniqueAds.values());

    uniqueSuggestions.sort((a, b) => {
      if (a.type === 'watchitem_match' && b.type !== 'watchitem_match') return -1;
      if (a.type !== 'watchitem_match' && b.type === 'watchitem_match') return 1;
      if (a.distanceKm !== null && b.distanceKm !== null) {
        return a.distanceKm - b.distanceKm;
      }
      return 0;
    });

    const aiTips = await this.generateAITips(twin, uniqueSuggestions);

    return {
      items: uniqueSuggestions.slice(0, 20),
      total: uniqueSuggestions.length,
      aiTips,
    };
  }

  async generateAITips(twin, suggestions) {
    const tips = [];

    if (suggestions.length === 0 && twin.watchItems.filter(w => w.isActive).length > 0) {
      tips.push({
        type: 'wait',
        message: 'Пока нет подходящих предложений. Мы уведомим вас, когда появятся.',
        icon: 'clock',
      });
    }

    const recentPrices = suggestions.slice(0, 5).map(s => s.ad.price).filter(Boolean);
    if (recentPrices.length >= 3) {
      const avgPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
      const minPrice = Math.min(...recentPrices);

      if (minPrice < avgPrice * 0.8) {
        tips.push({
          type: 'deal',
          message: `Есть выгодное предложение! Цена ниже средней на ${Math.round((1 - minPrice / avgPrice) * 100)}%`,
          icon: 'sparkles',
        });
      }
    }

    const nearbyCount = suggestions.filter(s => s.distanceKm !== null && s.distanceKm < 3).length;
    if (nearbyCount >= 3) {
      tips.push({
        type: 'nearby',
        message: `Рядом с вами ${nearbyCount} подходящих предложений`,
        icon: 'map-pin',
      });
    }

    if (twin.preferences.priceSensitivity === 'high' && suggestions.length > 0) {
      tips.push({
        type: 'advice',
        message: 'Совет: подождите 1-2 дня — цены часто снижаются в выходные',
        icon: 'lightbulb',
      });
    }

    return tips;
  }

  async handleNewAd(ad) {
    try {
      const matchingTwins = await this.findMatchingTwins(ad);

      for (const { twin, watchItems } of matchingTwins) {
        for (const watchItem of watchItems) {
          if (!watchItem.notifyOnNew) continue;

          const now = new Date();
          const lastNotified = watchItem.lastNotifiedAt;
          if (lastNotified && (now - lastNotified) < 60 * 60 * 1000) {
            continue;
          }

          twin.addRecommendation(
            ad._id,
            'new_match',
            `Новое объявление по запросу "${watchItem.title}": ${ad.title}`,
            watchItem._id
          );

          watchItem.lastNotifiedAt = now;
          watchItem.matchCount = (watchItem.matchCount || 0) + 1;

          await this.sendNotification(twin, {
            type: 'new_match',
            title: `Новое: ${ad.title}`,
            message: `Появилось объявление по вашему запросу "${watchItem.title}"`,
            adId: ad._id,
          });
        }

        await twin.save();
      }
    } catch (error) {
      console.error('[DigitalTwin] handleNewAd error:', error);
    }
  }

  async handlePriceChange(adBefore, adAfter) {
    try {
      if (!adBefore.price || !adAfter.price) return;
      if (adAfter.price >= adBefore.price) return;

      const priceDrop = ((adBefore.price - adAfter.price) / adBefore.price) * 100;
      if (priceDrop < 5) return;

      const matchingTwins = await this.findTwinsInterestedInAd(adAfter);

      for (const twin of matchingTwins) {
        twin.addRecommendation(
          adAfter._id,
          'price_drop',
          `Цена снизилась на ${Math.round(priceDrop)}%: ${adAfter.title}`,
          null
        );

        const shouldNotify = twin.watchItems.some(w =>
          w.isActive && w.notifyOnPriceDrop &&
          (w.maxPrice === undefined || adAfter.price <= w.maxPrice)
        );

        if (shouldNotify) {
          await this.sendNotification(twin, {
            type: 'price_drop',
            title: `Цена снизилась на ${Math.round(priceDrop)}%`,
            message: `${adAfter.title}: было ${adBefore.price} ₽, стало ${adAfter.price} ₽`,
            adId: adAfter._id,
          });
        }

        await twin.save();
      }
    } catch (error) {
      console.error('[DigitalTwin] handlePriceChange error:', error);
    }
  }

  async findMatchingTwins(ad) {
    const matchingTwins = [];

    const twins = await UserTwin.find({
      'watchItems.isActive': true,
    });

    for (const twin of twins) {
      const matchingWatchItems = [];

      for (const watchItem of twin.getActiveWatchItems()) {
        if (this.matchesWatchItem(ad, watchItem)) {
          matchingWatchItems.push(watchItem);
        }
      }

      if (matchingWatchItems.length > 0) {
        matchingTwins.push({ twin, watchItems: matchingWatchItems });
      }
    }

    return matchingTwins;
  }

  matchesWatchItem(ad, watchItem) {
    if (watchItem.categoryId && ad.categoryId?.toString() !== watchItem.categoryId.toString()) {
      return false;
    }

    if (watchItem.maxPrice && ad.price > watchItem.maxPrice) {
      return false;
    }

    if (watchItem.minPrice && ad.price < watchItem.minPrice) {
      return false;
    }

    if (watchItem.query) {
      const query = watchItem.query.toLowerCase();
      const title = (ad.title || '').toLowerCase();
      const description = (ad.description || '').toLowerCase();

      if (!title.includes(query) && !description.includes(query)) {
        return false;
      }
    }

    return true;
  }

  async findTwinsInterestedInAd(ad) {
    const twins = await UserTwin.find({
      $or: [
        { 'history.adId': ad._id },
        { 'interests.categoryId': ad.categoryId },
      ],
    });

    return twins;
  }

  async sendNotification(twin, notification) {
    if (!twin.preferences.notificationsEnabled) {
      return;
    }

    if (twin.preferences.quietHoursStart !== undefined && twin.preferences.quietHoursEnd !== undefined) {
      const currentHour = new Date().getHours();
      const start = twin.preferences.quietHoursStart;
      const end = twin.preferences.quietHoursEnd;

      if (start < end) {
        if (currentHour >= start && currentHour < end) return;
      } else {
        if (currentHour >= start || currentHour < end) return;
      }
    }

    if (twin.telegramId) {
      try {
        const message = `${notification.title}\n\n${notification.message}`;
        await sendMessageToTelegramId(twin.telegramId, message);
      } catch (error) {
        console.error('[DigitalTwin] Failed to send Telegram notification:', error);
      }
    }
  }

  async getRecommendations(userId, limit = 20) {
    const twin = await this.getTwin(userId);

    const recommendations = twin.recommendations
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    const adIds = recommendations.map(r => r.adId).filter(Boolean);
    const ads = await Ad.find({ _id: { $in: adIds } }).lean();
    const adMap = {};
    ads.forEach(ad => { adMap[ad._id.toString()] = ad; });

    return recommendations.map(r => ({
      ...r.toObject(),
      ad: adMap[r.adId?.toString()],
    }));
  }

  async markRecommendationsRead(userId, recommendationIds = null) {
    const twin = await this.getTwin(userId);
    twin.markRecommendationsRead(recommendationIds);
    await twin.save();
    return { success: true };
  }

  async aiChat(userId, message, geo = {}) {
    const twin = await this.getTwin(userId);

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('напомни') || lowerMessage.includes('уведоми')) {
      const watchItem = await this.parseWatchItemFromMessage(message, twin);
      if (watchItem) {
        const added = await this.addWatchItem(userId, watchItem);
        return {
          type: 'watch_item_created',
          message: `Создано напоминание: "${added.title}". Я сообщу, когда появится подходящее предложение!`,
          watchItem: added,
        };
      }
    }

    if (lowerMessage.includes('где') || lowerMessage.includes('найди') || lowerMessage.includes('покажи')) {
      const searchResult = await this.parseAndSearch(message, geo);
      if (searchResult.items.length > 0) {
        return {
          type: 'search_results',
          message: `Нашёл ${searchResult.items.length} предложений:`,
          items: searchResult.items.slice(0, 5),
          createWatchSuggestion: true,
        };
      } else {
        return {
          type: 'no_results',
          message: 'К сожалению, ничего не нашёл. Хотите, чтобы я уведомил вас, когда появится?',
          createWatchSuggestion: true,
          suggestedQuery: message,
        };
      }
    }

    if (lowerMessage.includes('что') && (lowerMessage.includes('есть') || lowerMessage.includes('рядом'))) {
      const suggestions = await this.getSuggestions(userId, geo);
      return {
        type: 'suggestions',
        message: `Вот что я нашёл для вас:`,
        items: suggestions.items.slice(0, 5),
        aiTips: suggestions.aiTips,
      };
    }

    return {
      type: 'general',
      message: 'Я могу помочь вам:\n• Найти товары рядом\n• Создать напоминание о нужных товарах\n• Следить за ценами\n\nПросто напишите, что ищете!',
    };
  }

  async parseWatchItemFromMessage(message, twin) {
    const patterns = [
      /напомни[,.]?\s*когда\s*появится\s+(.+?)(?:\s+рядом|\s+в\s+\d+\s*км|$)/i,
      /уведоми[,.]?\s*о\s+(.+?)(?:\s+до\s+(\d+)|$)/i,
      /хочу\s+купить\s+(.+?)(?:\s+до\s+(\d+)|$)/i,
      /ищу\s+(.+?)(?:\s+до\s+(\d+)|$)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const title = match[1].trim();
        const maxPrice = match[2] ? parseInt(match[2]) : undefined;

        return {
          title,
          query: title,
          maxPrice,
          radiusKm: twin.preferences.maxRadiusKmDefault || 10,
          notifyOnNew: true,
          notifyOnPriceDrop: true,
        };
      }
    }

    return null;
  }

  async parseAndSearch(message, geo) {
    const priceMatch = message.match(/до\s+(\d+)/i);
    const maxPrice = priceMatch ? parseInt(priceMatch[1]) : undefined;

    const radiusMatch = message.match(/в\s+(\d+)\s*км/i);
    const radiusKm = radiusMatch ? parseInt(radiusMatch[1]) : (geo.radiusKm || 10);

    let query = message
      .replace(/где|найди|покажи|дешевле|до\s+\d+|в\s+\d+\s*км|рядом|от\s+меня/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    const result = await this.smartSearch.search({
      query,
      lat: geo.lat,
      lng: geo.lng,
      radiusKm,
      limit: 20,
    });

    if (maxPrice) {
      result.items = result.items.filter(ad => ad.price <= maxPrice);
    }

    return result;
  }

  async getStats(userId) {
    const twin = await this.getTwin(userId);

    return {
      interestsCount: twin.interests.length,
      watchItemsCount: twin.watchItems.length,
      activeWatchItemsCount: twin.watchItems.filter(w => w.isActive).length,
      historyCount: twin.history.length,
      recommendationsCount: twin.recommendations.length,
      unreadRecommendationsCount: twin.getUnreadRecommendations().length,
      topInterests: twin.interests.slice(0, 5).map(i => ({
        query: i.query,
        categoryId: i.categoryId,
        weight: i.weight,
      })),
      lastActiveAt: twin.lastActiveAt,
    };
  }
}

export default new DigitalTwinService();
