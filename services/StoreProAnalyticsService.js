import mongoose from 'mongoose';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import StoreDailyStats from '../models/StoreDailyStats.js';
import SellerProfile from '../models/SellerProfile.js';
import Ad from '../models/Ad.js';
import Category from '../models/Category.js';

class StoreProAnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000;
  }

  getCacheKey(method, params) {
    return `${method}:${JSON.stringify(params)}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  getPeriodDates(period) {
    const endDate = new Date();
    endDate.setUTCHours(23, 59, 59, 999);
    
    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '365d':
        startDate.setDate(startDate.getDate() - 365);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }
    
    return { startDate, endDate };
  }

  async getOverview(storeId, period = '30d') {
    const cacheKey = this.getCacheKey('overview', { storeId, period });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const { startDate, endDate } = this.getPeriodDates(period);
    
    const store = await SellerProfile.findById(storeId).lean();
    if (!store) {
      throw new Error('Store not found');
    }

    const [eventStats, topAds, topCategories, geoStats] = await Promise.all([
      this.aggregateEventStats(storeId, startDate, endDate),
      this.getTopAdsByViews(storeId, startDate, endDate, 5),
      this.getTopCategoriesByViews(storeId, startDate, endDate, 5),
      this.getGeoRadiusStats(storeId, startDate, endDate),
    ]);

    const ctrContacts = eventStats.totalViews > 0
      ? (eventStats.totalContactClicks / eventStats.totalViews * 100).toFixed(2)
      : 0;

    const result = {
      periodStart: startDate.toISOString(),
      periodEnd: endDate.toISOString(),
      totalViews: eventStats.totalViews,
      totalContactClicks: eventStats.totalContactClicks,
      totalFavorites: eventStats.totalFavorites,
      totalTelegramOpens: eventStats.totalTelegramOpens,
      totalCallClicks: eventStats.totalCallClicks,
      totalShares: eventStats.totalShares,
      ctrContacts: parseFloat(ctrContacts),
      topAdsByViews: topAds,
      topCategoriesByViews: topCategories,
      geoRadiusBest: geoStats.bestRadius,
      bySource: eventStats.bySource,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  async aggregateEventStats(storeId, startDate, endDate) {
    const stats = await AnalyticsEvent.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalViews: {
            $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] },
          },
          totalStoreViews: {
            $sum: { $cond: [{ $eq: ['$type', 'store_view'] }, 1, 0] },
          },
          totalContactClicks: {
            $sum: { $cond: [{ $eq: ['$type', 'contact'] }, 1, 0] },
          },
          totalFavorites: {
            $sum: { $cond: [{ $eq: ['$type', 'favorite'] }, 1, 0] },
          },
          totalUnfavorites: {
            $sum: { $cond: [{ $eq: ['$type', 'unfavorite'] }, 1, 0] },
          },
          totalTelegramOpens: {
            $sum: { $cond: [{ $eq: ['$type', 'message'] }, 1, 0] },
          },
          totalCallClicks: {
            $sum: { $cond: [{ $eq: ['$type', 'call'] }, 1, 0] },
          },
          totalShares: {
            $sum: { $cond: [{ $eq: ['$type', 'share'] }, 1, 0] },
          },
          totalSearchHits: {
            $sum: { $cond: [{ $eq: ['$type', 'search_hit'] }, 1, 0] },
          },
          organicCount: {
            $sum: { $cond: [{ $eq: ['$source', 'organic'] }, 1, 0] },
          },
          boostCount: {
            $sum: { $cond: [{ $eq: ['$source', 'boost'] }, 1, 0] },
          },
          bannerCount: {
            $sum: { $cond: [{ $eq: ['$source', 'banner'] }, 1, 0] },
          },
          campaignCount: {
            $sum: { $cond: [{ $eq: ['$source', 'campaign'] }, 1, 0] },
          },
        },
      },
    ]);

    const result = stats[0] || {
      totalViews: 0,
      totalStoreViews: 0,
      totalContactClicks: 0,
      totalFavorites: 0,
      totalUnfavorites: 0,
      totalTelegramOpens: 0,
      totalCallClicks: 0,
      totalShares: 0,
      totalSearchHits: 0,
      organicCount: 0,
      boostCount: 0,
      bannerCount: 0,
      campaignCount: 0,
    };

    result.bySource = {
      organic: result.organicCount,
      boost: result.boostCount,
      banner: result.bannerCount,
      campaign: result.campaignCount,
    };

    return result;
  }

  async getTopAdsByViews(storeId, startDate, endDate, limit = 5) {
    const topAds = await AnalyticsEvent.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
          type: { $in: ['view', 'contact', 'favorite'] },
          adId: { $ne: null },
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$adId',
          views: {
            $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] },
          },
          contactClicks: {
            $sum: { $cond: [{ $eq: ['$type', 'contact'] }, 1, 0] },
          },
          favorites: {
            $sum: { $cond: [{ $eq: ['$type', 'favorite'] }, 1, 0] },
          },
        },
      },
      { $sort: { views: -1 } },
      { $limit: limit },
    ]);

    const adIds = topAds.map(a => a._id);
    const ads = await Ad.find({ _id: { $in: adIds } })
      .select('_id title photos price status')
      .lean();

    const adsMap = new Map(ads.map(a => [a._id.toString(), a]));

    return topAds.map(stat => {
      const ad = adsMap.get(stat._id.toString()) || {};
      return {
        id: stat._id,
        title: ad.title || 'Удалённое объявление',
        photo: ad.photos?.[0] || null,
        price: ad.price || 0,
        status: ad.status || 'unknown',
        views: stat.views,
        contactClicks: stat.contactClicks,
        favorites: stat.favorites,
      };
    });
  }

  async getTopCategoriesByViews(storeId, startDate, endDate, limit = 5) {
    const categoryStats = await AnalyticsEvent.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
          type: { $in: ['view', 'contact'] },
          categoryId: { $ne: null },
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$categoryId',
          views: {
            $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] },
          },
          contactClicks: {
            $sum: { $cond: [{ $eq: ['$type', 'contact'] }, 1, 0] },
          },
        },
      },
      { $sort: { views: -1 } },
      { $limit: limit },
    ]);

    const categoryIds = categoryStats.map(c => c._id);
    const categories = await Category.find({ _id: { $in: categoryIds } })
      .select('_id name slug')
      .lean();

    const catMap = new Map(categories.map(c => [c._id.toString(), c]));

    return categoryStats.map(stat => {
      const cat = catMap.get(stat._id.toString()) || {};
      return {
        categoryId: stat._id,
        categoryName: cat.name || 'Неизвестная категория',
        slug: cat.slug || '',
        views: stat.views,
        contactClicks: stat.contactClicks,
      };
    });
  }

  async getGeoRadiusStats(storeId, startDate, endDate) {
    const geoStats = await AnalyticsEvent.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
          type: 'contact',
          geo: { $ne: null },
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            lat: { $round: ['$geo.lat', 1] },
            lng: { $round: ['$geo.lng', 1] },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    return {
      bestRadius: geoStats[0] ? {
        lat: geoStats[0]._id.lat,
        lng: geoStats[0]._id.lng,
        count: geoStats[0].count,
      } : null,
    };
  }

  async getDailyMetrics(storeId, metric = 'views', period = '30d') {
    const cacheKey = this.getCacheKey('daily', { storeId, metric, period });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const { startDate, endDate } = this.getPeriodDates(period);

    const typeMapping = {
      views: 'view',
      contactClicks: 'contact',
      favorites: 'favorite',
      telegramOpens: 'message',
      callClicks: 'call',
      shares: 'share',
    };

    const eventType = typeMapping[metric] || 'view';

    const dailyStats = await AnalyticsEvent.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
          type: eventType,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          value: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const daysInPeriod = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const dateMap = new Map(dailyStats.map(d => [d._id, d.value]));
    
    const result = [];
    let totalValue = 0;
    
    for (let i = 0; i < daysInPeriod; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const value = dateMap.get(dateStr) || 0;
      totalValue += value;
      result.push({ date: dateStr, value });
    }

    const response = {
      data: result,
      totalValue,
      metric,
      period,
    };

    this.setCache(cacheKey, response);
    return response;
  }

  async getDailyDetail(storeId, date) {
    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const [stats, topAds] = await Promise.all([
      AnalyticsEvent.aggregate([
        {
          $match: {
            storeId: new mongoose.Types.ObjectId(storeId),
            createdAt: { $gte: dayStart, $lte: dayEnd },
          },
        },
        {
          $group: {
            _id: null,
            views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
            favorites: { $sum: { $cond: [{ $eq: ['$type', 'favorite'] }, 1, 0] } },
            contactClicks: { $sum: { $cond: [{ $eq: ['$type', 'contact'] }, 1, 0] } },
            telegramOpens: { $sum: { $cond: [{ $eq: ['$type', 'message'] }, 1, 0] } },
            callClicks: { $sum: { $cond: [{ $eq: ['$type', 'call'] }, 1, 0] } },
          },
        },
      ]),
      this.getTopAdsByViews(storeId, dayStart, dayEnd, 3),
    ]);

    return {
      date: date,
      stats: stats[0] || {
        views: 0,
        favorites: 0,
        contactClicks: 0,
        telegramOpens: 0,
        callClicks: 0,
      },
      topAds,
    };
  }

  async getAdsEfficiency(storeId, period = '30d', sort = 'views') {
    const cacheKey = this.getCacheKey('ads', { storeId, period, sort });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const { startDate, endDate } = this.getPeriodDates(period);

    const store = await SellerProfile.findById(storeId).lean();
    if (!store) {
      throw new Error('Store not found');
    }

    const ads = await Ad.find({ sellerTelegramId: store.telegramId })
      .select('_id title photos price status categoryId createdAt')
      .lean();

    const adIds = ads.map(a => a._id);

    const adStats = await AnalyticsEvent.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
          adId: { $in: adIds },
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$adId',
          views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
          favorites: { $sum: { $cond: [{ $eq: ['$type', 'favorite'] }, 1, 0] } },
          contactClicks: { $sum: { $cond: [{ $eq: ['$type', 'contact'] }, 1, 0] } },
          telegramOpens: { $sum: { $cond: [{ $eq: ['$type', 'message'] }, 1, 0] } },
          callClicks: { $sum: { $cond: [{ $eq: ['$type', 'call'] }, 1, 0] } },
        },
      },
    ]);

    const statsMap = new Map(adStats.map(s => [s._id.toString(), s]));

    const result = ads.map(ad => {
      const stats = statsMap.get(ad._id.toString()) || {
        views: 0,
        favorites: 0,
        contactClicks: 0,
        telegramOpens: 0,
        callClicks: 0,
      };
      
      const ctrContacts = stats.views > 0
        ? (stats.contactClicks / stats.views * 100).toFixed(2)
        : 0;

      return {
        adId: ad._id,
        title: ad.title,
        photo: ad.photos?.[0] || null,
        price: ad.price,
        status: ad.status,
        categoryId: ad.categoryId,
        views: stats.views,
        favorites: stats.favorites,
        contactClicks: stats.contactClicks,
        telegramOpens: stats.telegramOpens,
        callClicks: stats.callClicks,
        ctrContacts: parseFloat(ctrContacts),
      };
    });

    const sortField = sort === 'ctr' ? 'ctrContacts' : sort;
    result.sort((a, b) => b[sortField] - a[sortField]);

    this.setCache(cacheKey, result);
    return result;
  }

  async getSeasonalAnalytics(storeId, period = '365d') {
    const cacheKey = this.getCacheKey('seasonal', { storeId, period });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const { startDate, endDate } = this.getPeriodDates(period);

    const [byMonth, byCategory] = await Promise.all([
      AnalyticsEvent.aggregate([
        {
          $match: {
            storeId: new mongoose.Types.ObjectId(storeId),
            type: { $in: ['view', 'contact'] },
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { $month: '$createdAt' },
            views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
            contactClicks: { $sum: { $cond: [{ $eq: ['$type', 'contact'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      AnalyticsEvent.aggregate([
        {
          $match: {
            storeId: new mongoose.Types.ObjectId(storeId),
            type: { $in: ['view', 'contact'] },
            categoryId: { $ne: null },
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: '$categoryId',
            views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
            contactClicks: { $sum: { $cond: [{ $eq: ['$type', 'contact'] }, 1, 0] } },
          },
        },
        { $sort: { views: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthData = byMonth.find(m => m._id === i + 1);
      return {
        month: i + 1,
        views: monthData?.views || 0,
        contactClicks: monthData?.contactClicks || 0,
      };
    });

    const bestMonths = [...monthlyData]
      .sort((a, b) => b.contactClicks - a.contactClicks)
      .slice(0, 3)
      .map(m => m.month);

    const categoryIds = byCategory.map(c => c._id);
    const categories = await Category.find({ _id: { $in: categoryIds } })
      .select('_id name')
      .lean();
    const catMap = new Map(categories.map(c => [c._id.toString(), c.name]));

    const categoryData = byCategory.map(c => ({
      categoryId: c._id,
      categoryName: catMap.get(c._id.toString()) || 'Неизвестная',
      views: c.views,
      contactClicks: c.contactClicks,
    }));

    const result = {
      byMonth: monthlyData,
      bestMonths,
      byCategory: categoryData,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  async rebuildStoreStats(storeId, fromDate, toDate) {
    console.log(`[StoreProAnalytics] Rebuilding stats for store ${storeId} from ${fromDate} to ${toDate}`);
    
    const store = await SellerProfile.findById(storeId).lean();
    if (!store) {
      throw new Error('Store not found');
    }

    const startDate = new Date(fromDate);
    startDate.setUTCHours(0, 0, 0, 0);
    
    const endDate = new Date(toDate);
    endDate.setUTCHours(23, 59, 59, 999);

    const dailyAggregation = await AnalyticsEvent.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
          favorites: { $sum: { $cond: [{ $eq: ['$type', 'favorite'] }, 1, 0] } },
          unfavorites: { $sum: { $cond: [{ $eq: ['$type', 'unfavorite'] }, 1, 0] } },
          contactClicks: { $sum: { $cond: [{ $eq: ['$type', 'contact'] }, 1, 0] } },
          telegramOpens: { $sum: { $cond: [{ $eq: ['$type', 'message'] }, 1, 0] } },
          callClicks: { $sum: { $cond: [{ $eq: ['$type', 'call'] }, 1, 0] } },
          shares: { $sum: { $cond: [{ $eq: ['$type', 'share'] }, 1, 0] } },
          searchHits: { $sum: { $cond: [{ $eq: ['$type', 'search_hit'] }, 1, 0] } },
          uniqueVisitors: { $addToSet: '$userId' },
          organic: { $sum: { $cond: [{ $eq: ['$source', 'organic'] }, 1, 0] } },
          boost: { $sum: { $cond: [{ $eq: ['$source', 'boost'] }, 1, 0] } },
          banner: { $sum: { $cond: [{ $eq: ['$source', 'banner'] }, 1, 0] } },
          campaign: { $sum: { $cond: [{ $eq: ['$source', 'campaign'] }, 1, 0] } },
        },
      },
    ]);

    for (const dayStats of dailyAggregation) {
      const date = new Date(dayStats._id);
      date.setUTCHours(0, 0, 0, 0);

      await StoreDailyStats.findOneAndUpdate(
        { storeId, date },
        {
          views: dayStats.views,
          favorites: dayStats.favorites,
          unfavorites: dayStats.unfavorites,
          contactClicks: dayStats.contactClicks,
          telegramOpens: dayStats.telegramOpens,
          callClicks: dayStats.callClicks,
          shares: dayStats.shares,
          searchHits: dayStats.searchHits,
          uniqueVisitors: dayStats.uniqueVisitors.filter(u => u).length,
          bySource: {
            organic: dayStats.organic,
            boost: dayStats.boost,
            banner: dayStats.banner,
            campaign: dayStats.campaign,
          },
        },
        { upsert: true }
      );
    }

    console.log(`[StoreProAnalytics] Rebuilt ${dailyAggregation.length} daily stats records`);
    return dailyAggregation.length;
  }

  async trackAdEvent(adId, type, options = {}) {
    try {
      const ad = await Ad.findById(adId).lean();
      if (!ad) {
        console.warn(`[StoreProAnalytics] Ad not found: ${adId}`);
        return null;
      }

      const store = await SellerProfile.findOne({ telegramId: ad.sellerTelegramId }).lean();
      
      const eventData = {
        adId,
        sellerId: ad.sellerId,
        storeId: store?._id || null,
        type,
        source: options.source || 'organic',
        campaignCode: options.campaignCode || null,
        categoryId: ad.categoryId,
        userId: options.userId || null,
        geo: options.geo || null,
        sessionId: options.sessionId || null,
        platform: options.platform || 'telegram',
        metadata: options.metadata || {},
      };

      const event = await AnalyticsEvent.trackEvent(eventData);

      if (store) {
        await StoreDailyStats.incrementMetric(store._id, this.getMetricField(type));
      }

      return event;
    } catch (error) {
      console.error('[StoreProAnalytics] Error tracking event:', error);
      return null;
    }
  }

  getMetricField(eventType) {
    const mapping = {
      view: 'views',
      store_view: 'views',
      contact: 'contactClicks',
      favorite: 'favorites',
      unfavorite: 'unfavorites',
      message: 'telegramOpens',
      call: 'callClicks',
      share: 'shares',
      search_hit: 'searchHits',
    };
    return mapping[eventType] || 'views';
  }
}

export default new StoreProAnalyticsService();
