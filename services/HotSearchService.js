import SearchLog from '../models/SearchLog.js';
import HotSearch from '../models/HotSearch.js';

const GEOHASH_PRECISION = 4;

function encodeGeoHash(lat, lng, precision = GEOHASH_PRECISION) {
  const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let hash = '';
  let bit = 0;
  let ch = 0;
  let isLng = true;

  while (hash.length < precision) {
    if (isLng) {
      const mid = (minLng + maxLng) / 2;
      if (lng > mid) {
        ch |= (1 << (4 - bit));
        minLng = mid;
      } else {
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat > mid) {
        ch |= (1 << (4 - bit));
        minLat = mid;
      } else {
        maxLat = mid;
      }
    }
    isLng = !isLng;
    bit++;
    if (bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

function getNeighborGeoHashes(geoHash) {
  return [geoHash];
}

function normalizeQuery(query) {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

class HotSearchService {
  static async logSearch({ query, userId, lat, lng, resultsCount = 0 }) {
    if (!query || query.trim().length < 2) {
      return null;
    }

    const normalizedQuery = normalizeQuery(query);
    if (normalizedQuery.length < 2) {
      return null;
    }

    const geoHash = lat && lng ? encodeGeoHash(lat, lng) : 'unknown';

    try {
      const searchLog = new SearchLog({
        query: query.trim(),
        normalizedQuery,
        userId: userId || null,
        location: lat && lng ? {
          type: 'Point',
          coordinates: [lng, lat],
        } : undefined,
        geoHash,
        resultsCount,
      });

      await searchLog.save();
      return searchLog;
    } catch (error) {
      console.error('[HotSearchService] Error logging search:', error.message);
      return null;
    }
  }

  static async aggregateHotSearches(hoursBack = 6, minCount = 5) {
    console.log(`[HotSearchService] Aggregating hot searches for last ${hoursBack} hours...`);

    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    try {
      const aggregation = await SearchLog.aggregate([
        {
          $match: {
            createdAt: { $gte: since },
            normalizedQuery: { $ne: '' },
          },
        },
        {
          $group: {
            _id: {
              geoHash: '$geoHash',
              normalizedQuery: '$normalizedQuery',
            },
            displayQuery: { $first: '$query' },
            count: { $sum: 1 },
            lastSearch: { $max: '$createdAt' },
          },
        },
        {
          $match: {
            count: { $gte: minCount },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      console.log(`[HotSearchService] Found ${aggregation.length} hot search candidates`);

      let updated = 0;
      let created = 0;

      for (const item of aggregation) {
        const { geoHash, normalizedQuery } = item._id;

        const result = await HotSearch.findOneAndUpdate(
          { geoHash, normalizedQuery },
          {
            $set: {
              displayQuery: item.displayQuery,
              hourlyCount: item.count,
              isActive: true,
              lastUpdatedAt: new Date(),
            },
            $inc: { count: item.count },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          { upsert: true, new: true }
        );

        if (result.createdAt.getTime() === result.lastUpdatedAt.getTime()) {
          created++;
        } else {
          updated++;
        }
      }

      await HotSearch.updateMany(
        {
          lastUpdatedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          isActive: true,
        },
        {
          $set: { isActive: false },
        }
      );

      console.log(`[HotSearchService] Created: ${created}, Updated: ${updated}`);
      return { created, updated, total: aggregation.length };
    } catch (error) {
      console.error('[HotSearchService] Aggregation error:', error);
      throw error;
    }
  }

  static async getHotSearches({ lat, lng, limit = 10, countryWide = false }) {
    try {
      let query = { isActive: true };

      if (!countryWide && lat && lng) {
        const geoHash = encodeGeoHash(lat, lng);
        const neighbors = getNeighborGeoHashes(geoHash);
        
        const geoHashPrefixes = [
          geoHash.substring(0, 2),
          geoHash.substring(0, 3),
          geoHash,
        ];

        query.geoHash = {
          $in: [...neighbors, ...geoHashPrefixes.map(p => new RegExp(`^${p}`))],
        };

        query.$or = [
          { geoHash: { $in: neighbors } },
          { geoHash: { $regex: `^${geoHash.substring(0, 3)}` } },
          { geoHash: { $regex: `^${geoHash.substring(0, 2)}` } },
        ];
        delete query.geoHash;
      }

      const hotSearches = await HotSearch.find(query)
        .sort({ count: -1, hourlyCount: -1 })
        .limit(limit * 2)
        .lean();

      const uniqueQueries = new Map();
      for (const hs of hotSearches) {
        if (!uniqueQueries.has(hs.normalizedQuery)) {
          uniqueQueries.set(hs.normalizedQuery, {
            query: hs.displayQuery,
            normalizedQuery: hs.normalizedQuery,
            count: hs.count,
            hourlyCount: hs.hourlyCount,
          });
        } else {
          const existing = uniqueQueries.get(hs.normalizedQuery);
          existing.count += hs.count;
          existing.hourlyCount += hs.hourlyCount;
        }
      }

      const results = Array.from(uniqueQueries.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return results;
    } catch (error) {
      console.error('[HotSearchService] Error getting hot searches:', error);
      return [];
    }
  }

  static async getHotSearchesCountryWide(limit = 10) {
    try {
      const aggregation = await HotSearch.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$normalizedQuery',
            displayQuery: { $first: '$displayQuery' },
            totalCount: { $sum: '$count' },
            totalHourly: { $sum: '$hourlyCount' },
          },
        },
        { $sort: { totalCount: -1 } },
        { $limit: limit },
      ]);

      return aggregation.map(item => ({
        query: item.displayQuery,
        normalizedQuery: item._id,
        count: item.totalCount,
        hourlyCount: item.totalHourly,
      }));
    } catch (error) {
      console.error('[HotSearchService] Error getting country-wide hot searches:', error);
      return [];
    }
  }

  static async cleanupOldLogs(daysOld = 7) {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    try {
      const result = await SearchLog.deleteMany({
        createdAt: { $lt: cutoff },
      });
      console.log(`[HotSearchService] Cleaned up ${result.deletedCount} old search logs`);
      return result.deletedCount;
    } catch (error) {
      console.error('[HotSearchService] Cleanup error:', error);
      return 0;
    }
  }
}

export default HotSearchService;
