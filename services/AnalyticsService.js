const Ad = require('../models/Ad');
const Category = require('../models/Category');
const SeasonalPriceStats = require('../models/SeasonalPriceStats');
const Favorite = require('../models/Favorite');

class AnalyticsService {
  /**
   * Calculate daily price stats for a category
   */
  async calculateDailyPriceStats(categoryId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await Ad.aggregate([
      {
        $match: {
          $or: [
            { categoryId: categoryId },
            { subcategoryId: categoryId },
          ],
          status: 'active',
          price: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          countAds: { $sum: 1 },
          totalViews: { $sum: { $ifNull: ['$views', 0] } },
        },
      },
    ]);

    if (!stats.length || stats[0].countAds === 0) {
      return null;
    }

    const result = stats[0];

    // Count favorites for this category's ads
    const categoryAds = await Ad.find({
      $or: [
        { categoryId: categoryId },
        { subcategoryId: categoryId },
      ],
      status: 'active',
    }).select('_id');
    
    const adIds = categoryAds.map(ad => ad._id);
    const totalFavorites = await Favorite.countDocuments({ adId: { $in: adIds } });

    // Upsert the stats
    await SeasonalPriceStats.findOneAndUpdate(
      { categoryId, date: today },
      {
        avgPrice: Math.round(result.avgPrice * 100) / 100,
        minPrice: result.minPrice,
        maxPrice: result.maxPrice,
        countAds: result.countAds,
        totalViews: result.totalViews,
        totalFavorites,
      },
      { upsert: true, new: true }
    );

    return result;
  }

  /**
   * Get seasonal trends for a category over days
   */
  async getSeasonalTrends(categoryId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const stats = await SeasonalPriceStats.find({
      categoryId,
      date: { $gte: startDate },
    })
      .sort({ date: 1 })
      .select('date avgPrice minPrice maxPrice countAds totalViews totalFavorites')
      .lean();

    return stats.map(s => ({
      date: s.date.toISOString().split('T')[0],
      avgPrice: s.avgPrice,
      minPrice: s.minPrice,
      maxPrice: s.maxPrice,
      countAds: s.countAds,
      views: s.totalViews,
      favorites: s.totalFavorites,
    }));
  }

  /**
   * Compare ad price to market average
   */
  async comparePriceToMarket(adId) {
    const ad = await Ad.findById(adId);
    if (!ad || !ad.price) {
      return null;
    }

    const categoryId = ad.subcategoryId || ad.categoryId;
    if (!categoryId) {
      return null;
    }

    // Get recent stats (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentStats = await SeasonalPriceStats.find({
      categoryId,
      date: { $gte: sevenDaysAgo },
    }).sort({ date: -1 }).limit(7).lean();

    if (!recentStats.length) {
      // Calculate on-the-fly
      const liveStats = await Ad.aggregate([
        {
          $match: {
            $or: [
              { categoryId },
              { subcategoryId: categoryId },
            ],
            status: 'active',
            price: { $gt: 0 },
            _id: { $ne: ad._id },
          },
        },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: '$price' },
            count: { $sum: 1 },
          },
        },
      ]);

      if (!liveStats.length || liveStats[0].count < 3) {
        return { status: 'insufficient_data', message: 'Недостаточно данных для сравнения' };
      }

      return this._calculateComparison(ad.price, liveStats[0].avgPrice);
    }

    // Use average of recent stats
    const avgMarketPrice = recentStats.reduce((sum, s) => sum + s.avgPrice, 0) / recentStats.length;
    return this._calculateComparison(ad.price, avgMarketPrice);
  }

  _calculateComparison(adPrice, marketAvg) {
    const diff = ((adPrice - marketAvg) / marketAvg) * 100;
    const diffRounded = Math.abs(Math.round(diff));

    if (diff < -10) {
      return {
        status: 'below_market',
        percent: diffRounded,
        message: `Ниже рынка на ${diffRounded}%`,
        color: '#10B981',
        icon: '📉',
      };
    } else if (diff > 10) {
      return {
        status: 'above_market',
        percent: diffRounded,
        message: `Выше рынка на ${diffRounded}%`,
        color: '#EF4444',
        icon: '📈',
      };
    } else {
      return {
        status: 'at_market',
        percent: diffRounded,
        message: 'По рынку',
        color: '#6B7280',
        icon: '➡️',
      };
    }
  }

  /**
   * Get category overview with stats
   */
  async getCategoryOverview(categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await SeasonalPriceStats.findOne({
      categoryId,
      date: today,
    }).lean();

    const trends = await this.getSeasonalTrends(categoryId, 7);

    // Calculate 7-day price change
    let priceChange = null;
    if (trends.length >= 2) {
      const oldPrice = trends[0].avgPrice;
      const newPrice = trends[trends.length - 1].avgPrice;
      if (oldPrice > 0) {
        priceChange = Math.round(((newPrice - oldPrice) / oldPrice) * 100);
      }
    }

    return {
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        icon3d: category.icon3d,
      },
      today: todayStats ? {
        avgPrice: todayStats.avgPrice,
        minPrice: todayStats.minPrice,
        maxPrice: todayStats.maxPrice,
        countAds: todayStats.countAds,
        views: todayStats.totalViews,
        favorites: todayStats.totalFavorites,
      } : null,
      trends,
      priceChange,
    };
  }

  /**
   * Update stats for all farmer/seasonal categories
   */
  async updateAllFarmerStats() {
    const farmerCategories = await Category.find({
      $or: [
        { isFarmerCategory: true },
        { isSeasonal: true },
      ],
    }).select('_id name');

    const results = [];
    for (const cat of farmerCategories) {
      try {
        await this.calculateDailyPriceStats(cat._id);
        results.push({ categoryId: cat._id, name: cat.name, status: 'ok' });
      } catch (err) {
        results.push({ categoryId: cat._id, name: cat.name, status: 'error', error: err.message });
      }
    }

    return results;
  }
}

module.exports = new AnalyticsService();
