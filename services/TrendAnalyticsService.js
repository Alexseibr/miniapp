import Ad from '../models/Ad.js';
import Category from '../models/Category.js';
import TrendEvent from '../models/TrendEvent.js';

const TREND_THRESHOLD = 0.25;
const MINIMUM_SAMPLE_SIZE = 5;
const TREND_EXPIRY_HOURS = 48;

class TrendAnalyticsService {
  async analyzeTrends() {
    console.log('[TrendAnalytics] Starting trend analysis...');
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    try {
      const supplyTrends = await this.analyzeSupplyTrends(now, oneDayAgo, twoDaysAgo);
      const demandTrends = await this.analyzeDemandTrends(now, oneDayAgo, twoDaysAgo);

      const allTrends = [...supplyTrends, ...demandTrends];
      
      if (allTrends.length > 0) {
        await TrendEvent.insertMany(allTrends);
        console.log(`[TrendAnalytics] Created ${allTrends.length} trend events`);
      }

      await this.expireOldTrends();

      return allTrends;
    } catch (error) {
      console.error('[TrendAnalytics] Error analyzing trends:', error);
      throw error;
    }
  }

  async analyzeSupplyTrends(now, oneDayAgo, twoDaysAgo) {
    const trends = [];

    const todayAds = await Ad.aggregate([
      {
        $match: {
          createdAt: { $gte: oneDayAgo, $lt: now },
          status: 'active',
        },
      },
      {
        $group: {
          _id: {
            categoryId: '$category',
            citySlug: '$citySlug',
          },
          count: { $sum: 1 },
          categorySlug: { $first: '$categorySlug' },
          location: { $first: '$location' },
        },
      },
    ]);

    const yesterdayAds = await Ad.aggregate([
      {
        $match: {
          createdAt: { $gte: twoDaysAgo, $lt: oneDayAgo },
          status: 'active',
        },
      },
      {
        $group: {
          _id: {
            categoryId: '$category',
            citySlug: '$citySlug',
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const yesterdayMap = new Map(
      yesterdayAds.map(item => [
        `${item._id.categoryId}-${item._id.citySlug}`,
        item.count,
      ])
    );

    for (const today of todayAds) {
      const key = `${today._id.categoryId}-${today._id.citySlug}`;
      const yesterdayCount = yesterdayMap.get(key) || 0;

      if (yesterdayCount < MINIMUM_SAMPLE_SIZE) continue;

      const delta = (today.count - yesterdayCount) / yesterdayCount;

      if (delta >= TREND_THRESHOLD) {
        const category = await Category.findById(today._id.categoryId).lean();
        
        if (category) {
          trends.push({
            categoryId: today._id.categoryId,
            categorySlug: category.slug,
            categoryName: category.name,
            citySlug: today._id.citySlug || 'unknown',
            cityName: today._id.citySlug || 'Неизвестно',
            location: today.location || { type: 'Point', coordinates: [0, 0] },
            eventType: 'SUPPLY_SPIKE',
            deltaPercent: Math.round(delta * 100),
            previousValue: yesterdayCount,
            currentValue: today.count,
            period: 'day',
            isActive: true,
            expiresAt: new Date(now.getTime() + TREND_EXPIRY_HOURS * 60 * 60 * 1000),
          });
        }
      }
    }

    return trends;
  }

  async analyzeDemandTrends(now, oneDayAgo, twoDaysAgo) {
    const trends = [];

    const todayViews = await Ad.aggregate([
      {
        $match: {
          status: 'active',
          views: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: {
            categoryId: '$category',
            citySlug: '$citySlug',
          },
          totalViews: { $sum: '$views' },
          categorySlug: { $first: '$categorySlug' },
          location: { $first: '$location' },
        },
      },
    ]);

    for (const item of todayViews) {
      if (item.totalViews < MINIMUM_SAMPLE_SIZE * 10) continue;

      const previousDayViews = await this.getHistoricalViews(
        item._id.categoryId,
        item._id.citySlug,
        twoDaysAgo,
        oneDayAgo
      );

      if (previousDayViews < MINIMUM_SAMPLE_SIZE * 5) continue;

      const estimatedTodayViews = item.totalViews * 0.3;
      const delta = (estimatedTodayViews - previousDayViews) / previousDayViews;

      if (delta >= TREND_THRESHOLD) {
        const category = await Category.findById(item._id.categoryId).lean();

        if (category) {
          trends.push({
            categoryId: item._id.categoryId,
            categorySlug: category.slug,
            categoryName: category.name,
            citySlug: item._id.citySlug || 'unknown',
            cityName: item._id.citySlug || 'Неизвестно',
            location: item.location || { type: 'Point', coordinates: [0, 0] },
            eventType: 'DEMAND_SPIKE',
            deltaPercent: Math.round(delta * 100),
            previousValue: Math.round(previousDayViews),
            currentValue: Math.round(estimatedTodayViews),
            period: 'day',
            isActive: true,
            expiresAt: new Date(now.getTime() + TREND_EXPIRY_HOURS * 60 * 60 * 1000),
          });
        }
      }
    }

    return trends;
  }

  async getHistoricalViews(categoryId, citySlug, startDate, endDate) {
    const result = await Ad.aggregate([
      {
        $match: {
          category: categoryId,
          citySlug: citySlug,
          updatedAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' },
        },
      },
    ]);

    return result[0]?.totalViews || 0;
  }

  async expireOldTrends() {
    const now = new Date();
    
    const result = await TrendEvent.updateMany(
      {
        isActive: true,
        expiresAt: { $lt: now },
      },
      {
        $set: { isActive: false },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`[TrendAnalytics] Expired ${result.modifiedCount} old trends`);
    }
  }

  async getLocalTrends(lat, lng, radiusKm = 10, limit = 10) {
    const now = new Date();

    await this.expireOldTrends();

    const query = {
      isActive: true,
      expiresAt: { $gt: now },
    };

    if (lat !== undefined && lng !== undefined) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          $maxDistance: radiusKm * 1000,
        },
      };
    }

    const trends = await TrendEvent.find(query)
      .sort({ deltaPercent: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return trends.map(trend => ({
      id: trend._id,
      categorySlug: trend.categorySlug,
      categoryName: trend.categoryName,
      brandKey: trend.brandKey,
      brandName: trend.brandName,
      citySlug: trend.citySlug,
      cityName: trend.cityName,
      eventType: trend.eventType,
      deltaPercent: trend.deltaPercent,
      period: trend.period,
      message: this.formatTrendMessage(trend),
      createdAt: trend.createdAt,
    }));
  }

  async getCountryTrends(limit = 10) {
    const now = new Date();

    await this.expireOldTrends();

    const trends = await TrendEvent.find({
      isActive: true,
      expiresAt: { $gt: now },
    })
      .sort({ deltaPercent: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return trends.map(trend => ({
      id: trend._id,
      categorySlug: trend.categorySlug,
      categoryName: trend.categoryName,
      brandKey: trend.brandKey,
      brandName: trend.brandName,
      citySlug: trend.citySlug,
      cityName: trend.cityName,
      eventType: trend.eventType,
      deltaPercent: trend.deltaPercent,
      period: trend.period,
      message: this.formatTrendMessage(trend),
      createdAt: trend.createdAt,
    }));
  }

  formatTrendMessage(trend) {
    const subject = trend.brandName || trend.categoryName;
    const delta = `+${trend.deltaPercent}%`;

    if (trend.eventType === 'DEMAND_SPIKE') {
      return `${subject}: спрос вырос на ${delta}`;
    } else {
      return `${subject}: объявлений стало больше на ${delta}`;
    }
  }
}

export default new TrendAnalyticsService();
