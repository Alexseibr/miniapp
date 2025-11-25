import SearchLog from '../models/SearchLog.js';
import DemandStats from '../models/DemandStats.js';
import Ad from '../models/Ad.js';
import User from '../models/User.js';
import ngeohash from 'ngeohash';

const HIGH_DEMAND_THRESHOLD = 5;

const CROSS_CATEGORY_DEMAND = {
  'газон': ['services', 'garden', 'tools'],
  'косить': ['services', 'garden', 'tools'],
  'выпечка': ['farmer-market', 'bakery', 'food'],
  'торт': ['farmer-market', 'bakery', 'food'],
  'велосипед': ['sports', 'bicycles', 'kids'],
  'самокат': ['sports', 'kids', 'electronics'],
  'ремонт': ['services', 'tools', 'auto'],
  'уборка': ['services', 'household'],
  'няня': ['services', 'kids'],
  'репетитор': ['services', 'education'],
  'доставка': ['services', 'auto'],
  'грузоперевозки': ['services', 'auto'],
  'сантехник': ['services', 'tools'],
  'электрик': ['services', 'tools'],
  'массаж': ['services', 'beauty'],
  'маникюр': ['services', 'beauty'],
  'фотограф': ['services', 'electronics'],
};

class DemandNotificationService {
  static async aggregateDemandStats(periodType = 'day') {
    const now = new Date();
    let periodStart;
    
    switch (periodType) {
      case 'hour':
        periodStart = new Date(now);
        periodStart.setMinutes(0, 0, 0);
        break;
      case 'week':
        periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - 7);
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'day':
      default:
        periodStart = new Date(now);
        periodStart.setHours(0, 0, 0, 0);
    }
    
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: periodStart },
          normalizedQuery: { $ne: null, $ne: '' },
        },
      },
      {
        $group: {
          _id: {
            normalizedQuery: '$normalizedQuery',
            geoHash: { $ifNull: ['$geoHash', 'unknown'] },
            detectedCategoryId: '$detectedCategoryId',
          },
          searchesCount: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          citySlug: { $first: '$citySlug' },
        },
      },
      {
        $project: {
          _id: 0,
          normalizedQuery: '$_id.normalizedQuery',
          geoHash: '$_id.geoHash',
          detectedCategoryId: '$_id.detectedCategoryId',
          searchesCount: 1,
          uniqueUsersCount: { $size: '$uniqueUsers' },
          citySlug: 1,
        },
      },
      {
        $match: {
          searchesCount: { $gte: 3 },
        },
      },
    ];
    
    const aggregatedStats = await SearchLog.aggregate(pipeline);
    
    const results = [];
    
    for (const stat of aggregatedStats) {
      try {
        const isHighDemand = stat.searchesCount >= HIGH_DEMAND_THRESHOLD;
        
        const demandStat = await DemandStats.findOneAndUpdate(
          {
            normalizedQuery: stat.normalizedQuery,
            geoHash: stat.geoHash,
            period: periodType,
            periodStart,
          },
          {
            searchesCount: stat.searchesCount,
            uniqueUsersCount: stat.uniqueUsersCount,
            detectedCategoryId: stat.detectedCategoryId,
            citySlug: stat.citySlug,
            isHighDemand,
            updatedAt: new Date(),
          },
          { upsert: true, new: true }
        );
        
        results.push(demandStat);
      } catch (error) {
        console.error('[DemandNotificationService] Error updating demand stat:', error);
      }
    }
    
    console.log(`[DemandNotificationService] Aggregated ${results.length} demand stats`);
    return results;
  }

  static async findSellersForDemand(demandStat) {
    const categories = [];
    
    if (demandStat.detectedCategoryId) {
      categories.push(demandStat.detectedCategoryId);
    }
    
    const queryWords = demandStat.normalizedQuery.split(' ');
    for (const word of queryWords) {
      const crossCategories = CROSS_CATEGORY_DEMAND[word];
      if (crossCategories) {
        categories.push(...crossCategories);
      }
    }
    
    if (categories.length === 0) {
      return [];
    }
    
    const uniqueCategories = [...new Set(categories)];
    
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    let geoFilter = {};
    if (demandStat.geoHash && demandStat.geoHash !== 'unknown') {
      try {
        const { latitude, longitude } = ngeohash.decode(demandStat.geoHash);
        geoFilter = {
          'location.geo': {
            $nearSphere: {
              $geometry: {
                type: 'Point',
                coordinates: [longitude, latitude],
              },
              $maxDistance: 10000,
            },
          },
        };
      } catch (e) {
        console.warn('[DemandNotificationService] Invalid geoHash:', demandStat.geoHash);
      }
    }
    
    const recentSellers = await Ad.aggregate([
      {
        $match: {
          createdAt: { $gte: threeMonthsAgo },
          $or: [
            { categoryId: { $in: uniqueCategories } },
            { subcategoryId: { $in: uniqueCategories } },
          ],
          ...geoFilter,
        },
      },
      {
        $group: {
          _id: '$sellerTelegramId',
          lastAdAt: { $max: '$createdAt' },
          adsCount: { $sum: 1 },
          categories: { $addToSet: '$categoryId' },
        },
      },
      {
        $match: {
          _id: { $ne: null },
        },
      },
      { $limit: 50 },
    ]);
    
    return recentSellers.map(seller => ({
      telegramId: seller._id,
      lastAdAt: seller.lastAdAt,
      adsCount: seller.adsCount,
      categories: seller.categories,
    }));
  }

  static async notifySellersAboutDemand(sendNotification) {
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    
    const highDemandStats = await DemandStats.find({
      isHighDemand: true,
      $or: [
        { notifiedSellersAt: null },
        { notifiedSellersAt: { $lt: oneDayAgo } },
      ],
    }).limit(20);
    
    const results = [];
    
    for (const demandStat of highDemandStats) {
      try {
        const sellers = await this.findSellersForDemand(demandStat);
        
        if (sellers.length === 0) continue;
        
        const locationText = demandStat.citySlug 
          ? `в ${demandStat.citySlug}` 
          : 'в вашем районе';
        
        for (const seller of sellers) {
          if (!seller.telegramId) continue;
          
          try {
            if (sendNotification) {
              await sendNotification(
                seller.telegramId,
                `📈 Высокий спрос ${locationText}!\n\n` +
                `${demandStat.searchesCount} человек за последние дни искали "${demandStat.normalizedQuery}".\n\n` +
                `Есть что предложить? Добавьте объявление или обновите существующие!`,
                'high_demand'
              );
            }
            
            results.push({
              demandStatId: demandStat._id,
              sellerId: seller.telegramId,
              query: demandStat.normalizedQuery,
            });
          } catch (error) {
            console.error(`[DemandNotificationService] Error notifying seller ${seller.telegramId}:`, error);
          }
        }
        
        await DemandStats.updateOne(
          { _id: demandStat._id },
          { notifiedSellersAt: now }
        );
      } catch (error) {
        console.error('[DemandNotificationService] Error processing demand stat:', error);
      }
    }
    
    console.log(`[DemandNotificationService] Notified ${results.length} sellers about demand`);
    return results;
  }

  static async getLocalDemandTrends(lat, lng, radiusKm = 10, limit = 10) {
    const geoHash = ngeohash.encode(lat, lng, 5);
    
    const neighbors = ngeohash.neighbors(geoHash);
    const allHashes = [geoHash, ...Object.values(neighbors)];
    
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const trends = await DemandStats.find({
      geoHash: { $in: allHashes },
      isHighDemand: true,
      updatedAt: { $gte: oneDayAgo },
    })
      .sort({ searchesCount: -1 })
      .limit(limit)
      .lean();
    
    return trends;
  }
}

export default DemandNotificationService;
