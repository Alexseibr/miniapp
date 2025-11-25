import GeoEvent from '../../models/GeoEvent.js';
import Ad from '../../models/Ad.js';
import ngeohash from 'ngeohash';

class HotspotEngine {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000;
  }

  getCacheKey(type, params) {
    return `${type}:${JSON.stringify(params)}`;
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

  async getDemandHotspots(input) {
    const { lat, lng, radiusKm = 10, hours = 24, threshold = 0.3 } = input;
    
    const cacheKey = this.getCacheKey('demand-hotspots', { 
      lat: Math.round(lat * 100), 
      lng: Math.round(lng * 100), 
      radiusKm, 
      hours 
    });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      const previousPeriodStart = new Date(Date.now() - hours * 2 * 60 * 60 * 1000);
      
      const [currentEvents, previousEvents] = await Promise.all([
        GeoEvent.aggregate([
          {
            $match: {
              location: {
                $geoWithin: {
                  $centerSphere: [[lng, lat], radiusKm / 6378.1]
                }
              },
              type: { $in: ['search', 'empty_search', 'view', 'favorite', 'category_open'] },
              createdAt: { $gte: since }
            }
          },
          {
            $group: {
              _id: { $substr: ['$geoHash', 0, 6] },
              count: { $sum: 1 },
              searches: { $sum: { $cond: [{ $eq: ['$type', 'search'] }, 1, 0] } },
              emptySearches: { $sum: { $cond: [{ $eq: ['$type', 'empty_search'] }, 1, 0] } },
              views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
              favorites: { $sum: { $cond: [{ $eq: ['$type', 'favorite'] }, 1, 0] } },
              avgLat: { $avg: { $arrayElemAt: ['$location.coordinates', 1] } },
              avgLng: { $avg: { $arrayElemAt: ['$location.coordinates', 0] } },
              categories: { $push: '$payload.categoryId' },
              queries: { $push: '$payload.query' }
            }
          },
          { $match: { avgLat: { $ne: null }, avgLng: { $ne: null } } },
          { $sort: { count: -1 } },
          { $limit: 100 }
        ]),
        GeoEvent.aggregate([
          {
            $match: {
              location: {
                $geoWithin: {
                  $centerSphere: [[lng, lat], radiusKm / 6378.1]
                }
              },
              type: { $in: ['search', 'empty_search', 'view', 'favorite'] },
              createdAt: { $gte: previousPeriodStart, $lt: since }
            }
          },
          {
            $group: {
              _id: { $substr: ['$geoHash', 0, 6] },
              count: { $sum: 1 }
            }
          }
        ])
      ]);
      
      const previousMap = new Map(previousEvents.map(e => [e._id, e.count]));
      
      let maxCount = 1;
      currentEvents.forEach(e => {
        if (e.count > maxCount) maxCount = e.count;
      });
      
      const hotspots = currentEvents
        .filter(event => event.avgLat && event.avgLng && !isNaN(event.avgLat) && !isNaN(event.avgLng))
        .map(event => {
          const previousCount = previousMap.get(event._id) || 0;
          const growthRate = previousCount > 0 
            ? ((event.count - previousCount) / previousCount) 
            : (event.count > 5 ? 1 : 0);
          
          const intensity = event.count / maxCount;
          const demandScore = (event.searches * 1 + event.emptySearches * 2 + event.views * 0.5 + event.favorites * 3) / event.count;
          
          const categoryCount = {};
          (event.categories || []).filter(Boolean).forEach(cat => {
            categoryCount[cat] = (categoryCount[cat] || 0) + 1;
          });
          const topCategories = Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([cat]) => cat);
          
          const queryCount = {};
          (event.queries || []).filter(Boolean).forEach(q => {
            queryCount[q] = (queryCount[q] || 0) + 1;
          });
          const topQueries = Object.entries(queryCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([q]) => q);
          
          return {
            lat: event.avgLat,
            lng: event.avgLng,
            geoHash: event._id,
            intensity,
            demandScore,
            growthRate,
            isHotspot: intensity >= threshold || growthRate > 0.3,
            eventCount: event.count,
            categoryHints: topCategories,
            queryHints: topQueries,
            metrics: {
              searches: event.searches,
              emptySearches: event.emptySearches,
              views: event.views,
              favorites: event.favorites
            }
          };
        })
        .filter(h => h.isHotspot)
        .sort((a, b) => b.intensity - a.intensity);
      
      const result = {
        success: true,
        data: {
          hotspots,
          summary: {
            totalHotspots: hotspots.length,
            highIntensity: hotspots.filter(h => h.intensity > 0.7).length,
            growingAreas: hotspots.filter(h => h.growthRate > 0.3).length,
            averageIntensity: hotspots.length > 0 
              ? hotspots.reduce((s, h) => s + h.intensity, 0) / hotspots.length 
              : 0
          }
        }
      };
      
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[HotspotEngine] getDemandHotspots error:', error);
      return { success: false, error: error.message, data: { hotspots: [], summary: {} } };
    }
  }

  async getSupplyHotspots(input) {
    const { lat, lng, radiusKm = 10, hours = 24, threshold = 0.3 } = input;
    
    const cacheKey = this.getCacheKey('supply-hotspots', { 
      lat: Math.round(lat * 100), 
      lng: Math.round(lng * 100), 
      radiusKm, 
      hours 
    });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const [recentAds, allAds] = await Promise.all([
        Ad.aggregate([
          {
            $match: {
              status: 'active',
              moderationStatus: 'approved',
              createdAt: { $gte: since },
              'location.coordinates': {
                $geoWithin: {
                  $centerSphere: [[lng, lat], radiusKm / 6378.1]
                }
              }
            }
          },
          {
            $addFields: {
              computedGeoHash: {
                $cond: {
                  if: { $and: [{ $ne: ['$geoHash', null] }, { $ne: ['$geoHash', ''] }] },
                  then: { $substr: ['$geoHash', 0, 6] },
                  else: 'unknown'
                }
              }
            }
          },
          {
            $group: {
              _id: '$computedGeoHash',
              newCount: { $sum: 1 },
              avgPrice: { $avg: '$price' },
              avgLat: { $avg: { $arrayElemAt: ['$location.coordinates', 1] } },
              avgLng: { $avg: { $arrayElemAt: ['$location.coordinates', 0] } },
              categories: { $push: '$categoryId' }
            }
          },
          { $match: { avgLat: { $ne: null }, avgLng: { $ne: null } } }
        ]),
        Ad.aggregate([
          {
            $match: {
              status: 'active',
              moderationStatus: 'approved',
              'location.coordinates': {
                $geoWithin: {
                  $centerSphere: [[lng, lat], radiusKm / 6378.1]
                }
              }
            }
          },
          {
            $addFields: {
              computedGeoHash: {
                $cond: {
                  if: { $and: [{ $ne: ['$geoHash', null] }, { $ne: ['$geoHash', ''] }] },
                  then: { $substr: ['$geoHash', 0, 6] },
                  else: 'unknown'
                }
              }
            }
          },
          {
            $group: {
              _id: '$computedGeoHash',
              totalCount: { $sum: 1 }
            }
          }
        ])
      ]);
      
      const totalMap = new Map(allAds.map(a => [a._id, a.totalCount]));
      
      let maxNewCount = 1;
      recentAds.forEach(a => {
        if (a.newCount > maxNewCount) maxNewCount = a.newCount;
      });
      
      const hotspots = recentAds
        .filter(area => area.avgLat && area.avgLng && !isNaN(area.avgLat) && !isNaN(area.avgLng))
        .map(area => {
          const totalCount = totalMap.get(area._id) || area.newCount;
          const newRatio = area.newCount / totalCount;
          const intensity = area.newCount / maxNewCount;
          
          const categoryCount = {};
          (area.categories || []).filter(Boolean).forEach(cat => {
            categoryCount[cat] = (categoryCount[cat] || 0) + 1;
          });
          const topCategories = Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([cat]) => cat);
          
          return {
            lat: area.avgLat,
            lng: area.avgLng,
            geoHash: area._id,
            intensity,
            newCount: area.newCount,
            totalCount,
            newRatio,
            avgPrice: Math.round(area.avgPrice * 100) / 100,
            isHotspot: intensity >= threshold || newRatio > 0.5,
            categoryHints: topCategories
          };
        })
        .filter(h => h.isHotspot)
        .sort((a, b) => b.intensity - a.intensity);
      
      const result = {
        success: true,
        data: {
          hotspots,
          summary: {
            totalHotspots: hotspots.length,
            totalNewAds: recentAds.reduce((s, a) => s + a.newCount, 0),
            highActivityAreas: hotspots.filter(h => h.intensity > 0.7).length
          }
        }
      };
      
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[HotspotEngine] getSupplyHotspots error:', error);
      return { success: false, error: error.message, data: { hotspots: [], summary: {} } };
    }
  }

  async getOpportunityZones(input) {
    const { lat, lng, radiusKm = 10 } = input;
    
    try {
      const [demandResult, supplyResult] = await Promise.all([
        this.getDemandHotspots({ lat, lng, radiusKm, hours: 48, threshold: 0.2 }),
        this.getSupplyHotspots({ lat, lng, radiusKm, hours: 48, threshold: 0.2 })
      ]);
      
      if (!demandResult.success || !supplyResult.success) {
        return { success: false, error: 'Failed to fetch hotspot data', data: { zones: [] } };
      }
      
      const demandMap = new Map(
        demandResult.data.hotspots.map(h => [h.geoHash, h])
      );
      const supplyMap = new Map(
        supplyResult.data.hotspots.map(h => [h.geoHash, h])
      );
      
      const zones = [];
      
      demandMap.forEach((demand, geoHash) => {
        const supply = supplyMap.get(geoHash);
        
        if (demand.intensity > 0.4 && (!supply || supply.intensity < 0.3)) {
          zones.push({
            lat: demand.lat,
            lng: demand.lng,
            geoHash,
            type: 'high_demand_low_supply',
            opportunityScore: demand.intensity * (1 - (supply?.intensity || 0)),
            demandIntensity: demand.intensity,
            supplyIntensity: supply?.intensity || 0,
            categoryHints: demand.categoryHints,
            queryHints: demand.queryHints,
            recommendation: 'Хорошая локация для продажи: высокий спрос, мало конкурентов'
          });
        }
      });
      
      supplyMap.forEach((supply, geoHash) => {
        if (!demandMap.has(geoHash) && supply.intensity > 0.5) {
          zones.push({
            lat: supply.lat,
            lng: supply.lng,
            geoHash,
            type: 'high_supply_low_demand',
            opportunityScore: supply.intensity * 0.3,
            demandIntensity: 0,
            supplyIntensity: supply.intensity,
            categoryHints: supply.categoryHints,
            recommendation: 'Много предложений, но мало спроса. Возможно, стоит снизить цену.'
          });
        }
      });
      
      zones.sort((a, b) => b.opportunityScore - a.opportunityScore);
      
      return {
        success: true,
        data: {
          zones: zones.slice(0, 20),
          summary: {
            highOpportunity: zones.filter(z => z.type === 'high_demand_low_supply').length,
            saturatedAreas: zones.filter(z => z.type === 'high_supply_low_demand').length
          }
        }
      };
    } catch (error) {
      console.error('[HotspotEngine] getOpportunityZones error:', error);
      return { success: false, error: error.message, data: { zones: [] } };
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export default new HotspotEngine();
