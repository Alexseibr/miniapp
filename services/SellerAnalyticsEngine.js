import AnalyticsEvent from '../models/AnalyticsEvent.js';
import Ad from '../models/Ad.js';
import SellerProfile from '../models/SellerProfile.js';
import SellerSubscription from '../models/SellerSubscription.js';
import Category from '../models/Category.js';
import mongoose from 'mongoose';

class SellerAnalyticsEngine {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  getCacheKey(method, sellerId, params = {}) {
    return `${method}:${sellerId}:${JSON.stringify(params)}`;
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

  async getOverview(sellerId, days = 7) {
    const cacheKey = this.getCacheKey('overview', sellerId, { days });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [stats, topProducts, profile, adsCount] = await Promise.all([
      AnalyticsEvent.getSellerStats(sellerId, days),
      AnalyticsEvent.getTopProducts(sellerId, 5, days),
      SellerProfile.findOne({ userId: sellerId }),
      Ad.countDocuments({ sellerTelegramId: { $exists: true }, status: 'active' }),
    ]);

    const previousStart = new Date(startDate);
    previousStart.setDate(previousStart.getDate() - days);
    const previousStats = await AnalyticsEvent.getSellerStats(sellerId, days * 2);

    const calculateChange = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const topProductsPopulated = await Ad.populate(topProducts, {
      path: '_id',
      select: 'title price photos status',
    });

    const result = {
      period: { days, startDate, endDate: new Date() },
      views: {
        total: (stats.view || 0) + (stats.store_view || 0),
        product: stats.view || 0,
        store: stats.store_view || 0,
        change: calculateChange(stats.view || 0, (previousStats.view || 0) / 2),
      },
      contacts: {
        total: stats.contact || 0,
        change: calculateChange(stats.contact || 0, (previousStats.contact || 0) / 2),
      },
      favorites: {
        added: stats.favorite || 0,
        removed: stats.unfavorite || 0,
        net: (stats.favorite || 0) - (stats.unfavorite || 0),
      },
      messages: stats.message || 0,
      searchHits: stats.search_hit || 0,
      subscribers: profile?.subscribersCount || 0,
      productsCount: adsCount,
      rating: profile?.ratings?.score || 0,
      reviewsCount: profile?.ratings?.count || 0,
      topProducts: topProductsPopulated.map(p => ({
        id: p._id?._id || p._id,
        title: p._id?.title || 'Товар удален',
        price: p._id?.price,
        photo: p._id?.photos?.[0],
        views: p.views,
        uniqueViews: p.uniqueViews,
      })),
    };

    this.setCache(cacheKey, result);
    return result;
  }

  async getViewsTimeline(sellerId, days = 30) {
    const cacheKey = this.getCacheKey('viewsTimeline', sellerId, { days });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const timeline = await AnalyticsEvent.getViewsTimeline(sellerId, days);

    const dateMap = {};
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dateMap[dateStr] = { date: dateStr, views: 0, storeViews: 0 };
    }

    timeline.forEach(item => {
      if (dateMap[item._id.date]) {
        if (item._id.type === 'view') {
          dateMap[item._id.date].views = item.count;
        } else if (item._id.type === 'store_view') {
          dateMap[item._id.date].storeViews = item.count;
        }
      }
    });

    const result = Object.values(dateMap).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    this.setCache(cacheKey, result);
    return result;
  }

  async getContactsTimeline(sellerId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const contacts = await AnalyticsEvent.aggregate([
      {
        $match: {
          sellerId: new mongoose.Types.ObjectId(sellerId),
          type: 'contact',
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dateMap = {};
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dateMap[dateStr] = { date: dateStr, contacts: 0 };
    }

    contacts.forEach(item => {
      if (dateMap[item._id]) {
        dateMap[item._id].contacts = item.count;
      }
    });

    return Object.values(dateMap);
  }

  async getCategoryPerformance(sellerId, days = 30) {
    const cacheKey = this.getCacheKey('categoryPerformance', sellerId, { days });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sellerAds = await Ad.find({ 
      sellerTelegramId: { $exists: true },
      status: 'active',
    }).select('categoryId price');

    const categoryIds = [...new Set(sellerAds.map(ad => ad.categoryId?.toString()).filter(Boolean))];

    const [categoryStats, marketPrices, categories] = await Promise.all([
      AnalyticsEvent.aggregate([
        {
          $match: {
            sellerId: new mongoose.Types.ObjectId(sellerId),
            categoryId: { $in: categoryIds.map(id => new mongoose.Types.ObjectId(id)) },
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: '$categoryId',
            views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
            contacts: { $sum: { $cond: [{ $eq: ['$type', 'contact'] }, 1, 0] } },
            favorites: { $sum: { $cond: [{ $eq: ['$type', 'favorite'] }, 1, 0] } },
          },
        },
      ]),
      Ad.aggregate([
        {
          $match: {
            categoryId: { $in: categoryIds.map(id => new mongoose.Types.ObjectId(id)) },
            status: 'active',
          },
        },
        {
          $group: {
            _id: '$categoryId',
            avgPrice: { $avg: '$price' },
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            count: { $sum: 1 },
          },
        },
      ]),
      Category.find({ _id: { $in: categoryIds } }).select('slug name icon'),
    ]);

    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat._id.toString()] = cat;
    });

    const statsMap = {};
    categoryStats.forEach(stat => {
      statsMap[stat._id.toString()] = stat;
    });

    const priceMap = {};
    marketPrices.forEach(price => {
      priceMap[price._id.toString()] = price;
    });

    const sellerPrices = {};
    sellerAds.forEach(ad => {
      if (ad.categoryId) {
        const catId = ad.categoryId.toString();
        if (!sellerPrices[catId]) {
          sellerPrices[catId] = { prices: [], count: 0 };
        }
        sellerPrices[catId].prices.push(ad.price);
        sellerPrices[catId].count++;
      }
    });

    const result = categoryIds.map(catId => {
      const category = categoryMap[catId];
      const stats = statsMap[catId] || { views: 0, contacts: 0, favorites: 0 };
      const market = priceMap[catId] || { avgPrice: 0, minPrice: 0, maxPrice: 0 };
      const seller = sellerPrices[catId] || { prices: [], count: 0 };

      const sellerAvgPrice = seller.prices.length > 0
        ? seller.prices.reduce((a, b) => a + b, 0) / seller.prices.length
        : 0;

      const pricePosition = market.avgPrice > 0
        ? Math.round(((sellerAvgPrice - market.avgPrice) / market.avgPrice) * 100)
        : 0;

      let recommendation = '';
      if (pricePosition > 15) {
        recommendation = 'Ваши цены выше рынка на ' + pricePosition + '%. Рекомендуем снизить.';
      } else if (pricePosition < -15) {
        recommendation = 'Ваши цены ниже рынка на ' + Math.abs(pricePosition) + '%. Можно повысить.';
      } else if (stats.views > 50 && stats.contacts < 3) {
        recommendation = 'Много просмотров, но мало контактов. Проверьте описание и фото.';
      }

      return {
        categoryId: catId,
        name: category?.name || 'Неизвестная категория',
        icon: category?.icon,
        productsCount: seller.count,
        views: stats.views,
        contacts: stats.contacts,
        favorites: stats.favorites,
        conversionRate: stats.views > 0 
          ? Math.round((stats.contacts / stats.views) * 100) 
          : 0,
        sellerAvgPrice: Math.round(sellerAvgPrice),
        marketAvgPrice: Math.round(market.avgPrice),
        marketMinPrice: Math.round(market.minPrice),
        pricePosition,
        recommendation,
      };
    });

    this.setCache(cacheKey, result);
    return result;
  }

  async getPricePosition(sellerId) {
    const sellerAds = await Ad.find({
      sellerTelegramId: { $exists: true },
      status: 'active',
    }).select('title price categoryId photos');

    const categoryIds = [...new Set(sellerAds.map(ad => ad.categoryId?.toString()).filter(Boolean))];

    const marketPrices = await Ad.aggregate([
      {
        $match: {
          categoryId: { $in: categoryIds.map(id => new mongoose.Types.ObjectId(id)) },
          status: 'active',
        },
      },
      {
        $group: {
          _id: '$categoryId',
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          prices: { $push: '$price' },
        },
      },
    ]);

    const priceMap = {};
    marketPrices.forEach(price => {
      priceMap[price._id.toString()] = price;
    });

    const result = sellerAds.map(ad => {
      const market = priceMap[ad.categoryId?.toString()] || { avgPrice: 0, minPrice: 0 };
      const diff = market.avgPrice > 0
        ? Math.round(((ad.price - market.avgPrice) / market.avgPrice) * 100)
        : 0;

      let status = 'normal';
      let recommendation = '';

      if (ad.price <= market.minPrice) {
        status = 'best_price';
        recommendation = 'Лучшая цена в категории!';
      } else if (diff > 20) {
        status = 'overpriced';
        recommendation = `Цена выше рынка на ${diff}%. Рекомендуемая: ${Math.round(market.avgPrice)} ₽`;
      } else if (diff < -20) {
        status = 'underpriced';
        recommendation = `Цена ниже рынка на ${Math.abs(diff)}%. Можно поднять до ${Math.round(market.avgPrice)} ₽`;
      }

      return {
        adId: ad._id,
        title: ad.title,
        photo: ad.photos?.[0],
        price: ad.price,
        marketAvg: Math.round(market.avgPrice),
        marketMin: Math.round(market.minPrice),
        diff,
        status,
        recommendation,
      };
    });

    return result.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }

  async getDemandHeatmap(sellerId, radiusKm = 20) {
    return AnalyticsEvent.getGeoHeatmap(sellerId, 30);
  }

  async getHotspots(sellerId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const hotspots = await AnalyticsEvent.aggregate([
      {
        $match: {
          sellerId: new mongoose.Types.ObjectId(sellerId),
          geo: { $ne: null },
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            lat: { $round: ['$geo.lat', 3] },
            lng: { $round: ['$geo.lng', 3] },
          },
          totalEvents: { $sum: 1 },
          views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
          contacts: { $sum: { $cond: [{ $eq: ['$type', 'contact'] }, 1, 0] } },
          favorites: { $sum: { $cond: [{ $eq: ['$type', 'favorite'] }, 1, 0] } },
        },
      },
      { $sort: { totalEvents: -1 } },
      { $limit: 50 },
    ]);

    return hotspots.map(h => ({
      lat: h._id.lat,
      lng: h._id.lng,
      totalEvents: h.totalEvents,
      views: h.views,
      contacts: h.contacts,
      favorites: h.favorites,
      intensity: Math.min(h.totalEvents / 20, 1),
    }));
  }

  async getSubscribersStats(sellerId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [subscriptions, profile] = await Promise.all([
      SellerSubscription.find({
        sellerId: new mongoose.Types.ObjectId(sellerId),
        createdAt: { $gte: startDate },
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('userId', 'firstName lastName username'),
      SellerProfile.findOne({ userId: sellerId }),
    ]);

    const timeline = await SellerSubscription.aggregate([
      {
        $match: {
          sellerId: new mongoose.Types.ObjectId(sellerId),
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      total: profile?.subscribersCount || 0,
      newThisPeriod: subscriptions.length,
      recentSubscribers: subscriptions.map(s => ({
        userId: s.userId?._id,
        name: s.userId?.firstName || s.userId?.username || 'Пользователь',
        date: s.createdAt,
      })),
      timeline: timeline.map(t => ({ date: t._id, count: t.count })),
    };
  }

  async getAISuggestions(sellerId, userLocation) {
    const suggestions = [];

    const [overview, categories, prices] = await Promise.all([
      this.getOverview(sellerId, 7),
      this.getCategoryPerformance(sellerId, 30),
      this.getPricePosition(sellerId),
    ]);

    const overpricedItems = prices.filter(p => p.status === 'overpriced');
    if (overpricedItems.length > 0) {
      suggestions.push({
        type: 'price',
        priority: 'high',
        icon: '📉',
        title: 'Цены выше рынка',
        message: `${overpricedItems.length} товаров стоят выше рынка. Снизьте цены для увеличения продаж.`,
        action: { type: 'navigate', target: '/seller/analytics/prices' },
      });
    }

    const underpricedItems = prices.filter(p => p.status === 'underpriced');
    if (underpricedItems.length > 0) {
      const potentialRevenue = underpricedItems.reduce((sum, item) => 
        sum + (item.marketAvg - item.price), 0
      );
      suggestions.push({
        type: 'price',
        priority: 'medium',
        icon: '💰',
        title: 'Можно заработать больше',
        message: `${underpricedItems.length} товаров ниже рыночной цены. Потенциальный доход: +${potentialRevenue} ₽`,
        action: { type: 'navigate', target: '/seller/analytics/prices' },
      });
    }

    const lowConversion = categories.filter(c => c.views > 30 && c.conversionRate < 3);
    if (lowConversion.length > 0) {
      suggestions.push({
        type: 'optimization',
        priority: 'medium',
        icon: '📊',
        title: 'Низкая конверсия',
        message: `Категория "${lowConversion[0].name}" имеет много просмотров, но мало контактов. Улучшите описания и фото.`,
        action: { type: 'navigate', target: '/my-ads' },
      });
    }

    if (overview.views.total === 0 && overview.productsCount > 0) {
      suggestions.push({
        type: 'visibility',
        priority: 'high',
        icon: '👁️',
        title: 'Нет просмотров',
        message: 'Ваши товары не получают просмотров. Добавьте качественные фото и детальные описания.',
        action: { type: 'navigate', target: '/my-ads' },
      });
    }

    if (overview.productsCount < 3) {
      suggestions.push({
        type: 'inventory',
        priority: 'medium',
        icon: '📦',
        title: 'Добавьте больше товаров',
        message: 'Продавцы с 5+ товарами получают на 40% больше просмотров.',
        action: { type: 'navigate', target: '/ads/create' },
      });
    }

    if (overview.subscribers < 5) {
      suggestions.push({
        type: 'growth',
        priority: 'low',
        icon: '🔔',
        title: 'Увеличьте подписчиков',
        message: 'Делитесь ссылкой на магазин в социальных сетях для привлечения подписчиков.',
        action: { type: 'share', target: 'store' },
      });
    }

    return suggestions.sort((a, b) => {
      const priority = { high: 0, medium: 1, low: 2 };
      return priority[a.priority] - priority[b.priority];
    });
  }

  async getWarnings(sellerId) {
    const warnings = [];

    const [adsWithoutPhotos, overview] = await Promise.all([
      Ad.countDocuments({
        sellerTelegramId: { $exists: true },
        status: 'active',
        $or: [{ photos: { $size: 0 } }, { photos: { $exists: false } }],
      }),
      this.getOverview(sellerId, 7),
    ]);

    if (adsWithoutPhotos > 0) {
      warnings.push({
        type: 'photos',
        severity: 'warning',
        icon: '📷',
        message: `${adsWithoutPhotos} товаров без фото`,
      });
    }

    if (overview.views.change < -30) {
      warnings.push({
        type: 'views',
        severity: 'alert',
        icon: '📉',
        message: `Просмотры упали на ${Math.abs(overview.views.change)}%`,
      });
    }

    return warnings;
  }
}

export default new SellerAnalyticsEngine();
