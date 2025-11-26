import Ad from '../models/Ad.js';
import User from '../models/User.js';
import UserTwin from '../models/UserTwin.js';
import GeoEvent from '../models/GeoEvent.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import ngeohash from 'ngeohash';

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

const RANKING_WEIGHTS = {
  similarity: 0.40,
  geo: 0.20,
  trending: 0.20,
  quality: 0.10,
  sellerAffinity: 0.10,
};

const FARMER_CATEGORIES = [
  'farmer', 'farmer-vegetables', 'farmer-fruits', 'farmer-berries',
  'farmer-dairy', 'farmer-meat', 'farmer-eggs', 'farmer-honey',
  'farmer-bakery', 'farmer-flowers', 'farmer-mushrooms', 'farmer-herbs',
];

const SEASONAL_CATEGORIES = {
  0: ['farmer-bakery', 'farmer-meat', 'farmer-dairy'],
  1: ['farmer-bakery', 'farmer-dairy'],
  2: ['farmer-flowers', 'farmer-herbs'],
  3: ['farmer-flowers', 'farmer-herbs', 'farmer-vegetables'],
  4: ['farmer-flowers', 'farmer-vegetables', 'farmer-berries'],
  5: ['farmer-berries', 'farmer-vegetables', 'farmer-fruits'],
  6: ['farmer-berries', 'farmer-vegetables', 'farmer-fruits'],
  7: ['farmer-vegetables', 'farmer-fruits', 'farmer-berries', 'farmer-honey'],
  8: ['farmer-fruits', 'farmer-mushrooms', 'farmer-honey'],
  9: ['farmer-fruits', 'farmer-mushrooms', 'farmer-vegetables'],
  10: ['farmer-vegetables', 'farmer-bakery', 'farmer-meat'],
  11: ['farmer-bakery', 'farmer-meat', 'farmer-dairy'],
};

class RecommendationEngine {
  constructor() {
    this.defaultRadius = 10;
    this.feedPageSize = 20;
  }

  getCacheKey(prefix, params) {
    return `rec:${prefix}:${JSON.stringify(params)}`;
  }

  getFromCache(key) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return entry.data;
    }
    cache.delete(key);
    return null;
  }

  setCache(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache() {
    cache.clear();
  }

  async getForYouFeed(options = {}) {
    const { userId, telegramId, lat, lng, radiusKm = 10, cursor = 0, limit = 20 } = options;

    try {
      const userContext = await this.getUserContext(userId, telegramId);
      
      const candidates = await this.getCandidates({
        lat, lng, radiusKm, userContext, limit: limit * 5,
      });

      const scoredItems = await this.rankCandidates(candidates, userContext, { lat, lng });
      
      scoredItems.sort((a, b) => b.score - a.score);
      
      const startIndex = Number(cursor) || 0;
      const paginatedItems = scoredItems.slice(startIndex, startIndex + limit);

      const aiInsights = this.generateAiInsights(userContext, scoredItems.slice(0, 10));

      return {
        success: true,
        items: paginatedItems.map(item => item.ad),
        scores: paginatedItems.map(item => ({
          adId: item.ad._id?.toString() || item.ad.id,
          score: Math.round(item.score * 100) / 100,
          reasons: item.reasons,
        })),
        cursor: startIndex + paginatedItems.length,
        hasMore: startIndex + paginatedItems.length < scoredItems.length,
        aiInsights,
        total: scoredItems.length,
      };
    } catch (error) {
      console.error('[RecommendationEngine] getForYouFeed error:', error);
      return {
        success: false,
        items: [],
        scores: [],
        cursor: 0,
        hasMore: false,
        error: error.message,
      };
    }
  }

  async getUserContext(userId, telegramId) {
    const context = {
      interests: [],
      recentSearches: [],
      viewedCategories: [],
      favoriteCategories: [],
      watchItems: [],
      subscribedSellers: [],
      priceRange: { min: 0, max: Infinity },
      preferredRadius: this.defaultRadius,
      activityPattern: {},
    };

    try {
      if (telegramId) {
        const twin = await UserTwin.findOne({ telegramId }).lean();
        if (twin) {
          context.interests = twin.interests || [];
          context.watchItems = twin.watchItems?.map(w => w.query) || [];
          context.preferredRadius = twin.preferences?.radiusKm || this.defaultRadius;
          
          if (twin.preferences?.priceMin || twin.preferences?.priceMax) {
            context.priceRange = {
              min: twin.preferences.priceMin || 0,
              max: twin.preferences.priceMax || Infinity,
            };
          }
        }
      }

      if (telegramId) {
        const recentEvents = await AnalyticsEvent.find({
          telegramId,
          eventType: { $in: ['view', 'search', 'favorite'] },
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

        const categoryViews = {};
        for (const event of recentEvents) {
          if (event.eventType === 'search' && event.data?.query) {
            context.recentSearches.push(event.data.query);
          }
          if (event.data?.categoryId) {
            categoryViews[event.data.categoryId] = (categoryViews[event.data.categoryId] || 0) + 1;
          }
        }

        context.viewedCategories = Object.entries(categoryViews)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([cat]) => cat);
      }
    } catch (error) {
      console.error('[RecommendationEngine] getUserContext error:', error);
    }

    return context;
  }

  async getCandidates(options = {}) {
    const { lat, lng, radiusKm = 10, userContext = {}, limit = 100 } = options;

    const candidates = [];
    const seenIds = new Set();

    try {
      if (lat && lng) {
        const geoQuery = {
          status: { $in: ['active', 'published'] },
          'location.lat': { $exists: true },
        };

        const radiusInDegrees = radiusKm / 111;
        geoQuery['location.lat'] = { $gte: lat - radiusInDegrees, $lte: lat + radiusInDegrees };
        geoQuery['location.lng'] = { $gte: lng - radiusInDegrees, $lte: lng + radiusInDegrees };

        const nearbyAds = await Ad.find(geoQuery)
          .sort({ updatedAt: -1 })
          .limit(limit)
          .lean();

        for (const ad of nearbyAds) {
          if (!seenIds.has(ad._id.toString())) {
            seenIds.add(ad._id.toString());
            candidates.push({ ad, source: 'nearby' });
          }
        }
      }

      if (userContext.viewedCategories?.length > 0) {
        const categoryAds = await Ad.find({
          status: { $in: ['active', 'published'] },
          categoryId: { $in: userContext.viewedCategories.slice(0, 5) },
        })
        .sort({ updatedAt: -1 })
        .limit(30)
        .lean();

        for (const ad of categoryAds) {
          if (!seenIds.has(ad._id.toString())) {
            seenIds.add(ad._id.toString());
            candidates.push({ ad, source: 'category_match' });
          }
        }
      }

      const currentMonth = new Date().getMonth();
      const seasonalCats = SEASONAL_CATEGORIES[currentMonth] || [];
      if (seasonalCats.length > 0) {
        const seasonalAds = await Ad.find({
          status: { $in: ['active', 'published'] },
          categoryId: { $in: seasonalCats },
        })
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean();

        for (const ad of seasonalAds) {
          if (!seenIds.has(ad._id.toString())) {
            seenIds.add(ad._id.toString());
            candidates.push({ ad, source: 'seasonal' });
          }
        }
      }

      if (candidates.length < limit / 2) {
        const recentAds = await Ad.find({
          status: { $in: ['active', 'published'] },
        })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean();

        for (const ad of recentAds) {
          if (!seenIds.has(ad._id.toString())) {
            seenIds.add(ad._id.toString());
            candidates.push({ ad, source: 'recent' });
          }
        }
      }

    } catch (error) {
      console.error('[RecommendationEngine] getCandidates error:', error);
    }

    return candidates;
  }

  async rankCandidates(candidates, userContext, geoContext = {}) {
    const rankedItems = [];

    for (const candidate of candidates) {
      const { ad, source } = candidate;
      const scores = {};
      const reasons = [];

      scores.similarity = this.calculateSimilarityScore(ad, userContext);
      if (scores.similarity > 0.5) {
        reasons.push('Соответствует вашим интересам');
      }

      scores.geo = this.calculateGeoScore(ad, geoContext);
      if (scores.geo > 0.7) {
        reasons.push('Рядом с вами');
      }

      scores.trending = this.calculateTrendingScore(ad, source);
      if (scores.trending > 0.6) {
        reasons.push('Популярное');
      }

      scores.quality = this.calculateQualityScore(ad);
      if (scores.quality > 0.8) {
        reasons.push('Качественное объявление');
      }

      scores.sellerAffinity = this.calculateSellerAffinityScore(ad, userContext);

      if (source === 'seasonal') {
        reasons.push('Сезонный товар');
      }

      const totalScore = 
        scores.similarity * RANKING_WEIGHTS.similarity +
        scores.geo * RANKING_WEIGHTS.geo +
        scores.trending * RANKING_WEIGHTS.trending +
        scores.quality * RANKING_WEIGHTS.quality +
        scores.sellerAffinity * RANKING_WEIGHTS.sellerAffinity;

      rankedItems.push({
        ad,
        score: totalScore,
        scores,
        reasons: reasons.slice(0, 2),
      });
    }

    return rankedItems;
  }

  calculateSimilarityScore(ad, userContext) {
    let score = 0.5;

    if (userContext.viewedCategories?.includes(ad.categoryId)) {
      score += 0.3;
    }

    if (userContext.interests?.some(i => 
      ad.title?.toLowerCase().includes(i.toLowerCase()) ||
      ad.description?.toLowerCase().includes(i.toLowerCase())
    )) {
      score += 0.2;
    }

    if (userContext.recentSearches?.some(search =>
      ad.title?.toLowerCase().includes(search.toLowerCase())
    )) {
      score += 0.25;
    }

    if (ad.price >= userContext.priceRange?.min && 
        ad.price <= (userContext.priceRange?.max || Infinity)) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  calculateGeoScore(ad, geoContext) {
    const { lat, lng } = geoContext;
    if (!lat || !lng || !ad.location?.lat || !ad.location?.lng) {
      return 0.5;
    }

    const distance = this.calculateDistance(lat, lng, ad.location.lat, ad.location.lng);
    
    if (distance <= 1) return 1.0;
    if (distance <= 3) return 0.9;
    if (distance <= 5) return 0.8;
    if (distance <= 10) return 0.6;
    if (distance <= 20) return 0.4;
    return 0.2;
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  calculateTrendingScore(ad, source) {
    let score = 0.5;

    const hoursSinceCreation = (Date.now() - new Date(ad.createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation < 24) {
      score += 0.3;
    } else if (hoursSinceCreation < 72) {
      score += 0.2;
    } else if (hoursSinceCreation < 168) {
      score += 0.1;
    }

    const viewsWeight = Math.min(0.2, (ad.viewsCount || 0) / 500);
    score += viewsWeight;

    if (source === 'seasonal') {
      score += 0.15;
    }

    return Math.min(1, score);
  }

  calculateQualityScore(ad) {
    let score = 0.5;

    const photoCount = ad.photos?.length || 0;
    if (photoCount >= 3) score += 0.25;
    else if (photoCount >= 1) score += 0.15;
    else score -= 0.2;

    const descLength = ad.description?.length || 0;
    if (descLength >= 200) score += 0.2;
    else if (descLength >= 100) score += 0.1;
    else if (descLength < 50) score -= 0.1;

    const titleLength = ad.title?.length || 0;
    if (titleLength >= 20 && titleLength <= 80) score += 0.1;

    return Math.max(0, Math.min(1, score));
  }

  calculateSellerAffinityScore(ad, userContext) {
    if (userContext.subscribedSellers?.includes(ad.sellerTelegramId?.toString())) {
      return 1.0;
    }
    return 0.5;
  }

  generateAiInsights(userContext, topItems) {
    const insights = [];

    const categories = {};
    for (const item of topItems) {
      const cat = item.ad.categoryId;
      if (cat) {
        categories[cat] = (categories[cat] || 0) + 1;
      }
    }

    const topCategory = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])[0];

    if (topCategory) {
      const categoryName = this.getCategoryDisplayName(topCategory[0]);
      insights.push({
        type: 'trending',
        icon: '🔥',
        text: `В вашем районе популярна категория "${categoryName}"`,
      });
    }

    const currentMonth = new Date().getMonth();
    const seasonalCats = SEASONAL_CATEGORIES[currentMonth] || [];
    const seasonalAd = topItems.find(item => seasonalCats.includes(item.ad.categoryId));
    if (seasonalAd) {
      const catName = this.getCategoryDisplayName(seasonalAd.ad.categoryId);
      insights.push({
        type: 'seasonal',
        icon: '🍓',
        text: `Сезон на ${catName} — лучшее время для покупки!`,
      });
    }

    const nearbyCount = topItems.filter(item => 
      item.scores?.geo > 0.8
    ).length;

    if (nearbyCount > 5) {
      insights.push({
        type: 'nearby',
        icon: '📍',
        text: `${nearbyCount} товаров в пешей доступности`,
      });
    }

    return insights.slice(0, 3);
  }

  getCategoryDisplayName(categoryId) {
    const names = {
      'farmer': 'Фермерские продукты',
      'farmer-vegetables': 'Овощи',
      'farmer-fruits': 'Фрукты',
      'farmer-berries': 'Ягоды',
      'farmer-dairy': 'Молочные продукты',
      'farmer-meat': 'Мясо',
      'farmer-eggs': 'Яйца',
      'farmer-honey': 'Мёд',
      'farmer-bakery': 'Выпечка',
      'farmer-flowers': 'Цветы',
      'farmer-mushrooms': 'Грибы',
      'farmer-herbs': 'Травы',
      'electronics': 'Электроника',
      'clothing': 'Одежда',
      'home': 'Дом и сад',
      'auto': 'Авто',
    };
    return names[categoryId] || categoryId;
  }

  async getTrendingNearby(options = {}) {
    const { lat, lng, radiusKm = 5, limit = 10 } = options;

    try {
      const cacheKey = this.getCacheKey('trending', { lat, lng, radiusKm });
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const radiusInDegrees = radiusKm / 111;
      const query = {
        status: { $in: ['active', 'published'] },
      };

      if (lat && lng) {
        query['location.lat'] = { $gte: lat - radiusInDegrees, $lte: lat + radiusInDegrees };
        query['location.lng'] = { $gte: lng - radiusInDegrees, $lte: lng + radiusInDegrees };
      }

      const recentViews = await AnalyticsEvent.aggregate([
        {
          $match: {
            eventType: 'view',
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: '$adId',
            viewCount: { $sum: 1 },
          },
        },
        { $sort: { viewCount: -1 } },
        { $limit: 50 },
      ]);

      const trendingAdIds = recentViews.map(v => v._id);

      let trendingAds = [];
      if (trendingAdIds.length > 0) {
        trendingAds = await Ad.find({
          _id: { $in: trendingAdIds },
          ...query,
        }).limit(limit).lean();
      }

      if (trendingAds.length < limit) {
        const additionalAds = await Ad.find(query)
          .sort({ viewsCount: -1, updatedAt: -1 })
          .limit(limit - trendingAds.length)
          .lean();
        
        const existingIds = new Set(trendingAds.map(a => a._id.toString()));
        for (const ad of additionalAds) {
          if (!existingIds.has(ad._id.toString())) {
            trendingAds.push(ad);
          }
        }
      }

      const result = {
        success: true,
        items: trendingAds,
        total: trendingAds.length,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[RecommendationEngine] getTrendingNearby error:', error);
      return { success: false, items: [], error: error.message };
    }
  }

  async getSimilarItems(adId, options = {}) {
    const { limit = 10 } = options;

    try {
      const ad = await Ad.findById(adId).lean();
      if (!ad) {
        return { success: false, items: [], error: 'Ad not found' };
      }

      const query = {
        _id: { $ne: ad._id },
        status: { $in: ['active', 'published'] },
        $or: [
          { categoryId: ad.categoryId },
          { title: { $regex: ad.title?.split(' ')[0] || '', $options: 'i' } },
        ],
      };

      if (ad.price) {
        query.price = {
          $gte: ad.price * 0.5,
          $lte: ad.price * 1.5,
        };
      }

      const similarAds = await Ad.find(query)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean();

      return {
        success: true,
        items: similarAds,
        total: similarAds.length,
      };
    } catch (error) {
      console.error('[RecommendationEngine] getSimilarItems error:', error);
      return { success: false, items: [], error: error.message };
    }
  }

  async logUserEvent(event) {
    const { userId, telegramId, adId, eventType, data = {} } = event;

    try {
      const analyticsEvent = new AnalyticsEvent({
        userId,
        telegramId,
        adId,
        eventType,
        data,
        createdAt: new Date(),
      });
      await analyticsEvent.save();

      if (telegramId && eventType === 'view' && data.categoryId) {
        await UserTwin.findOneAndUpdate(
          { telegramId },
          {
            $addToSet: { interests: data.categoryId },
            $set: { updatedAt: new Date() },
          },
          { upsert: true }
        );
      }

      if (telegramId && eventType === 'favorite') {
        await UserTwin.findOneAndUpdate(
          { telegramId },
          {
            $addToSet: { 
              interests: data.categoryId,
              'activity.favorites': adId,
            },
            $set: { updatedAt: new Date() },
          },
          { upsert: true }
        );
      }

      if (telegramId && eventType === 'search' && data.query) {
        await UserTwin.findOneAndUpdate(
          { telegramId },
          {
            $push: { 
              'activity.searches': {
                $each: [{ query: data.query, timestamp: new Date() }],
                $slice: -50,
              },
            },
            $set: { updatedAt: new Date() },
          },
          { upsert: true }
        );
      }

      return { success: true };
    } catch (error) {
      console.error('[RecommendationEngine] logUserEvent error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new RecommendationEngine();
