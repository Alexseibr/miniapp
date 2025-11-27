import cron from 'node-cron';
import SearchLog from '../models/SearchLog.js';
import FarmerDemand from '../models/FarmerDemand.js';

class FarmerDemandWorker {
  constructor() {
    this.isRunning = false;
  }

  start() {
    console.log('[FarmerDemandWorker] Starting demand aggregation worker...');
    
    cron.schedule('0 * * * *', async () => {
      await this.aggregateDemand();
    });
    
    console.log('[FarmerDemandWorker] Cron job scheduled - runs every hour');
  }

  async aggregateDemand() {
    if (this.isRunning) {
      console.log('[FarmerDemandWorker] Already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('[FarmerDemandWorker] Starting demand aggregation...');
      
      const now = new Date();
      const h24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const d7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const d14Ago = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      
      const last24hAgg = await SearchLog.aggregate([
        {
          $match: {
            isFarmerSearch: true,
            createdAt: { $gte: h24Ago },
            regionId: { $exists: true, $ne: null },
          },
        },
        { $unwind: '$matchedFarmerKeywords' },
        {
          $group: {
            _id: {
              regionId: '$regionId',
              productKey: '$matchedFarmerKeywords',
            },
            searches24h: { $sum: 1 },
            uniqueUsers24h: { $addToSet: '$telegramId' },
            lastSearchAt: { $max: '$createdAt' },
            geoHash: { $first: '$geoHash' },
            citySlug: { $first: '$citySlug' },
          },
        },
        {
          $project: {
            regionId: '$_id.regionId',
            productKey: '$_id.productKey',
            searches24h: 1,
            uniqueUsers24h: { $size: '$uniqueUsers24h' },
            lastSearchAt: 1,
            geoHash: 1,
            citySlug: 1,
          },
        },
      ]);
      
      const last7dAgg = await SearchLog.aggregate([
        {
          $match: {
            isFarmerSearch: true,
            createdAt: { $gte: d7Ago },
            regionId: { $exists: true, $ne: null },
          },
        },
        { $unwind: '$matchedFarmerKeywords' },
        {
          $group: {
            _id: {
              regionId: '$regionId',
              productKey: '$matchedFarmerKeywords',
            },
            searches7d: { $sum: 1 },
            uniqueUsers7d: { $addToSet: '$telegramId' },
          },
        },
        {
          $project: {
            regionId: '$_id.regionId',
            productKey: '$_id.productKey',
            searches7d: 1,
            uniqueUsers7d: { $size: '$uniqueUsers7d' },
          },
        },
      ]);
      
      const previousWeekAgg = await SearchLog.aggregate([
        {
          $match: {
            isFarmerSearch: true,
            createdAt: { $gte: d14Ago, $lt: d7Ago },
            regionId: { $exists: true, $ne: null },
          },
        },
        { $unwind: '$matchedFarmerKeywords' },
        {
          $group: {
            _id: {
              regionId: '$regionId',
              productKey: '$matchedFarmerKeywords',
            },
            previousWeekSearches: { $sum: 1 },
          },
        },
      ]);
      
      const demandMap = new Map();
      
      for (const item of last24hAgg) {
        const key = `${item.regionId}:${item.productKey}`;
        demandMap.set(key, {
          regionId: item.regionId,
          productKey: item.productKey,
          searches24h: item.searches24h,
          uniqueUsers24h: item.uniqueUsers24h,
          lastSearchAt: item.lastSearchAt,
          geoHash: item.geoHash,
          citySlug: item.citySlug,
          searches7d: 0,
          uniqueUsers7d: 0,
          previousWeekSearches: 0,
        });
      }
      
      for (const item of last7dAgg) {
        const key = `${item.regionId}:${item.productKey}`;
        if (demandMap.has(key)) {
          demandMap.get(key).searches7d = item.searches7d;
          demandMap.get(key).uniqueUsers7d = item.uniqueUsers7d;
        } else {
          demandMap.set(key, {
            regionId: item.regionId,
            productKey: item.productKey,
            searches24h: 0,
            uniqueUsers24h: 0,
            searches7d: item.searches7d,
            uniqueUsers7d: item.uniqueUsers7d,
            previousWeekSearches: 0,
          });
        }
      }
      
      for (const item of previousWeekAgg) {
        const key = `${item._id.regionId}:${item._id.productKey}`;
        if (demandMap.has(key)) {
          demandMap.get(key).previousWeekSearches = item.previousWeekSearches;
        }
      }
      
      let updatedCount = 0;
      
      for (const demand of demandMap.values()) {
        const { searches7d, previousWeekSearches } = demand;
        
        let trend = 'flat';
        let trendPercent = 0;
        
        if (previousWeekSearches > 0) {
          trendPercent = ((searches7d - previousWeekSearches) / previousWeekSearches) * 100;
          
          if (trendPercent > 20) {
            trend = 'up';
          } else if (trendPercent < -20) {
            trend = 'down';
          }
        } else if (searches7d > 3) {
          trend = 'up';
          trendPercent = 100;
        }
        
        await FarmerDemand.upsertDemand(demand.regionId, demand.productKey, {
          searches24h: demand.searches24h,
          searches7d: demand.searches7d,
          uniqueUsers24h: demand.uniqueUsers24h,
          uniqueUsers7d: demand.uniqueUsers7d,
          trend,
          trendPercent: Math.round(trendPercent),
          previousWeekSearches,
          lastSearchAt: demand.lastSearchAt,
          geoHash: demand.geoHash,
          citySlug: demand.citySlug,
        });
        
        updatedCount++;
      }
      
      const duration = Date.now() - startTime;
      console.log(`[FarmerDemandWorker] Aggregation complete: ${updatedCount} records updated in ${duration}ms`);
      
    } catch (error) {
      console.error('[FarmerDemandWorker] Aggregation error:', error);
    } finally {
      this.isRunning = false;
    }
  }
}

const farmerDemandWorker = new FarmerDemandWorker();
export default farmerDemandWorker;
