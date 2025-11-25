import GeoEvent from '../../models/GeoEvent.js';
import Ad from '../../models/Ad.js';
import ngeohash from 'ngeohash';

class GeoEngine {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 30000; // 30 seconds
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
    
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  async getHeatmapDemand(input) {
    const { lat, lng, radiusKm = 10, hours = 24 } = input;
    
    const cacheKey = this.getCacheKey('demand', { lat: Math.round(lat * 100), lng: Math.round(lng * 100), radiusKm });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      const heatmapData = await GeoEvent.getDemandHeatmap({ lat, lng, radiusKm, hours });
      
      const points = heatmapData.map(point => ({
        lat: point.lat,
        lng: point.lng,
        intensity: Math.min(point.intensity / 10, 1),
        count: point.count,
        searches: point.searches,
        emptySearches: point.emptySearches,
        geoHash: point.geoHash
      }));
      
      const result = { success: true, data: { points, totalEvents: points.reduce((s, p) => s + p.count, 0) } };
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[GeoEngine] getHeatmapDemand error:', error);
      return { success: false, error: error.message, data: { points: [] } };
    }
  }

  async getHeatmapSupply(input) {
    const { lat, lng, radiusKm = 10, categoryId } = input;
    
    const cacheKey = this.getCacheKey('supply', { lat: Math.round(lat * 100), lng: Math.round(lng * 100), radiusKm, categoryId });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      const query = {
        status: 'active',
        moderationStatus: 'approved',
        'location.coordinates': {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusKm / 6378.1]
          }
        }
      };
      
      if (categoryId) {
        query.categoryId = categoryId;
      }
      
      const ads = await Ad.aggregate([
        { $match: query },
        {
          $project: {
            geoHash: { $substr: ['$geoHash', 0, 6] },
            lat: { $arrayElemAt: ['$location.coordinates', 1] },
            lng: { $arrayElemAt: ['$location.coordinates', 0] },
            price: 1,
            categoryId: 1
          }
        },
        {
          $group: {
            _id: '$geoHash',
            count: { $sum: 1 },
            avgPrice: { $avg: '$price' },
            avgLat: { $avg: '$lat' },
            avgLng: { $avg: '$lng' },
            categories: { $push: '$categoryId' }
          }
        },
        {
          $project: {
            geoHash: '$_id',
            count: 1,
            avgPrice: { $round: ['$avgPrice', 2] },
            lat: '$avgLat',
            lng: '$avgLng',
            dominantCategory: { $arrayElemAt: ['$categories', 0] }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 500 }
      ]);
      
      const points = ads.map(point => ({
        lat: point.lat,
        lng: point.lng,
        intensity: Math.min(point.count / 20, 1),
        count: point.count,
        avgPrice: point.avgPrice,
        dominantCategory: point.dominantCategory,
        geoHash: point.geoHash
      }));
      
      const result = { success: true, data: { points, totalAds: points.reduce((s, p) => s + p.count, 0) } };
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[GeoEngine] getHeatmapSupply error:', error);
      return { success: false, error: error.message, data: { points: [] } };
    }
  }

  async getTrendingSearches(input) {
    const { lat, lng, radiusKm = 10, limit = 10 } = input;
    
    const cacheKey = this.getCacheKey('trending', { lat: Math.round(lat * 100), lng: Math.round(lng * 100), radiusKm });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      const trends = await GeoEvent.getTrendingSearches({ lat, lng, radiusKm, limit });
      
      const result = { success: true, data: { trends } };
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[GeoEngine] getTrendingSearches error:', error);
      return { success: false, error: error.message, data: { trends: [] } };
    }
  }

  async getTrendingSupply(input) {
    const { lat, lng, radiusKm = 10, hours = 24, limit = 10 } = input;
    
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const query = {
        status: 'active',
        moderationStatus: 'approved',
        createdAt: { $gte: since }
      };
      
      if (lat && lng) {
        query['location.coordinates'] = {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusKm / 6378.1]
          }
        };
      }
      
      const trends = await Ad.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$categoryId',
            count: { $sum: 1 },
            avgPrice: { $avg: '$price' },
            ads: { $push: { id: '$_id', title: '$title', price: '$price' } }
          }
        },
        {
          $project: {
            categoryId: '$_id',
            newAdsCount: '$count',
            avgPrice: { $round: ['$avgPrice', 2] },
            sampleAds: { $slice: ['$ads', 3] }
          }
        },
        { $sort: { newAdsCount: -1 } },
        { $limit: limit }
      ]);
      
      return { success: true, data: { trends } };
    } catch (error) {
      console.error('[GeoEngine] getTrendingSupply error:', error);
      return { success: false, error: error.message, data: { trends: [] } };
    }
  }

  async getGeoFeed(input) {
    const { lat, lng, radiusKm = 10, categoryId, subcategoryId, priceMin, priceMax, sortBy = 'distance', limit = 20, skip = 0 } = input;
    
    try {
      const query = {
        status: 'active',
        moderationStatus: 'approved'
      };
      
      if (categoryId) query.categoryId = categoryId;
      if (subcategoryId) query.subcategoryId = subcategoryId;
      
      if (priceMin !== undefined || priceMax !== undefined) {
        query.price = {};
        if (priceMin !== undefined) query.price.$gte = priceMin;
        if (priceMax !== undefined) query.price.$lte = priceMax;
      }
      
      let ads = [];
      
      if (lat && lng) {
        query['location.coordinates'] = {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusKm / 6378.1]
          }
        };
        
        const aggregation = [
          {
            $geoNear: {
              near: { type: 'Point', coordinates: [lng, lat] },
              distanceField: 'distance',
              maxDistance: radiusKm * 1000,
              spherical: true,
              query: { status: 'active', moderationStatus: 'approved', ...( categoryId ? { categoryId } : {}) }
            }
          },
          { $skip: skip },
          { $limit: limit }
        ];
        
        if (sortBy === 'price_asc') {
          aggregation.push({ $sort: { price: 1 } });
        } else if (sortBy === 'price_desc') {
          aggregation.push({ $sort: { price: -1 } });
        } else if (sortBy === 'newest') {
          aggregation.push({ $sort: { createdAt: -1 } });
        } else if (sortBy === 'popular') {
          aggregation.push({ $sort: { views: -1 } });
        }
        
        try {
          ads = await Ad.aggregate(aggregation);
        } catch (e) {
          ads = await Ad.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
        }
      } else {
        let sort = { createdAt: -1 };
        if (sortBy === 'price_asc') sort = { price: 1 };
        if (sortBy === 'price_desc') sort = { price: -1 };
        if (sortBy === 'popular') sort = { views: -1 };
        
        ads = await Ad.find(query).sort(sort).skip(skip).limit(limit).lean();
      }
      
      ads = ads.map(ad => ({
        ...ad,
        distance: ad.distance ? Math.round(ad.distance) : null,
        distanceKm: ad.distance ? (ad.distance / 1000).toFixed(1) : null
      }));
      
      return { success: true, data: { ads, count: ads.length, hasMore: ads.length === limit } };
    } catch (error) {
      console.error('[GeoEngine] getGeoFeed error:', error);
      return { success: false, error: error.message, data: { ads: [] } };
    }
  }

  async getClusteredMarkers(input) {
    const { lat, lng, radiusKm = 10, zoom = 12, categoryId } = input;
    
    try {
      const precision = zoom >= 15 ? 7 : zoom >= 12 ? 6 : zoom >= 9 ? 5 : 4;
      
      const query = {
        status: 'active',
        moderationStatus: 'approved'
      };
      
      if (categoryId) query.categoryId = categoryId;
      
      if (lat && lng) {
        query['location.coordinates'] = {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusKm / 6378.1]
          }
        };
      }
      
      const clusters = await Ad.aggregate([
        { $match: query },
        {
          $project: {
            geoHash: { $substr: ['$geoHash', 0, precision] },
            lat: { $arrayElemAt: ['$location.coordinates', 1] },
            lng: { $arrayElemAt: ['$location.coordinates', 0] },
            price: 1,
            categoryId: 1,
            title: 1,
            photos: { $arrayElemAt: ['$photos', 0] }
          }
        },
        {
          $group: {
            _id: '$geoHash',
            count: { $sum: 1 },
            avgPrice: { $avg: '$price' },
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            avgLat: { $avg: '$lat' },
            avgLng: { $avg: '$lng' },
            categories: { $addToSet: '$categoryId' },
            sampleAd: { $first: { title: '$title', price: '$price', photo: '$photos' } }
          }
        },
        {
          $project: {
            geoHash: '$_id',
            count: 1,
            avgPrice: { $round: ['$avgPrice', 2] },
            minPrice: 1,
            maxPrice: 1,
            lat: '$avgLat',
            lng: '$avgLng',
            categories: 1,
            sampleAd: 1,
            isCluster: { $gt: ['$count', 1] }
          }
        },
        { $limit: 200 }
      ]);
      
      return { success: true, data: { clusters, precision } };
    } catch (error) {
      console.error('[GeoEngine] getClusteredMarkers error:', error);
      return { success: false, error: error.message, data: { clusters: [] } };
    }
  }

  async getDemandForCategory(input) {
    const { categoryId, lat, lng, radiusKm = 20 } = input;
    
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const demandStats = await GeoEvent.aggregate([
        {
          $match: {
            'payload.categoryId': categoryId,
            type: { $in: ['search', 'empty_search', 'category_open', 'view'] },
            createdAt: { $gte: since },
            ...(lat && lng ? {
              location: {
                $geoWithin: {
                  $centerSphere: [[lng, lat], radiusKm / 6378.1]
                }
              }
            } : {})
          }
        },
        {
          $group: {
            _id: null,
            totalEvents: { $sum: 1 },
            searches: { $sum: { $cond: [{ $eq: ['$type', 'search'] }, 1, 0] } },
            emptySearches: { $sum: { $cond: [{ $eq: ['$type', 'empty_search'] }, 1, 0] } },
            views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
            uniqueUsers: { $addToSet: '$telegramId' }
          }
        },
        {
          $project: {
            totalEvents: 1,
            searches: 1,
            emptySearches: 1,
            views: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
            demandScore: { $add: ['$searches', { $multiply: ['$emptySearches', 2] }, { $multiply: ['$views', 0.5] }] }
          }
        }
      ]);
      
      const supplyCount = await Ad.countDocuments({
        categoryId,
        status: 'active',
        ...(lat && lng ? {
          'location.coordinates': {
            $geoWithin: { $centerSphere: [[lng, lat], radiusKm / 6378.1] }
          }
        } : {})
      });
      
      const stats = demandStats[0] || { totalEvents: 0, searches: 0, emptySearches: 0, views: 0, uniqueUsers: 0, demandScore: 0 };
      
      const demandSupplyRatio = supplyCount > 0 ? stats.demandScore / supplyCount : stats.demandScore;
      
      let recommendation = 'neutral';
      if (demandSupplyRatio > 2) {
        recommendation = 'high_demand';
      } else if (demandSupplyRatio < 0.5) {
        recommendation = 'oversupply';
      }
      
      return {
        success: true,
        data: {
          categoryId,
          demand: stats,
          supply: supplyCount,
          demandSupplyRatio: Math.round(demandSupplyRatio * 100) / 100,
          recommendation
        }
      };
    } catch (error) {
      console.error('[GeoEngine] getDemandForCategory error:', error);
      return { success: false, error: error.message };
    }
  }

  async getGeoRecommendations(input) {
    const { telegramId, lat, lng, role = 'buyer' } = input;
    
    try {
      const recommendations = [];
      
      if (role === 'seller' || role === 'farmer') {
        const trendingSearches = await this.getTrendingSearches({ lat, lng, radiusKm: 5, limit: 5 });
        
        if (trendingSearches.success && trendingSearches.data.trends.length > 0) {
          const topTrend = trendingSearches.data.trends[0];
          recommendations.push({
            type: 'demand_opportunity',
            priority: 'high',
            message: `В вашем районе ищут: ${topTrend.query}`,
            details: { query: topTrend.query, count: topTrend.count },
            action: 'create_ad'
          });
        }
        
        const emptySearches = await GeoEvent.find({
          type: 'empty_search',
          location: { $geoWithin: { $centerSphere: [[lng, lat], 3 / 6378.1] } },
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }).distinct('payload.query');
        
        if (emptySearches.length > 0) {
          recommendations.push({
            type: 'unmet_demand',
            priority: 'medium',
            message: `Нет предложений рядом: ${emptySearches.slice(0, 3).join(', ')}`,
            details: { queries: emptySearches.slice(0, 5) },
            action: 'create_ad'
          });
        }
      }
      
      if (role === 'buyer') {
        const newAds = await Ad.find({
          status: 'active',
          moderationStatus: 'approved',
          createdAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
          'location.coordinates': { $geoWithin: { $centerSphere: [[lng, lat], 2 / 6378.1] } }
        }).limit(5).lean();
        
        if (newAds.length > 0) {
          recommendations.push({
            type: 'new_nearby',
            priority: 'medium',
            message: `${newAds.length} новых объявлений рядом`,
            details: { ads: newAds.map(a => ({ id: a._id, title: a.title, price: a.price })) },
            action: 'view_feed'
          });
        }
      }
      
      return { success: true, data: { recommendations } };
    } catch (error) {
      console.error('[GeoEngine] getGeoRecommendations error:', error);
      return { success: false, error: error.message, data: { recommendations: [] } };
    }
  }

  async logGeoEvent(eventData) {
    try {
      const event = await GeoEvent.logEvent(eventData);
      return { success: true, eventId: event._id };
    } catch (error) {
      console.error('[GeoEngine] logGeoEvent error:', error);
      return { success: false, error: error.message };
    }
  }
}

const geoEngine = new GeoEngine();

export default geoEngine;
export { GeoEngine };
