import AdStats from '../models/AdStats.js';
import Ad from '../models/Ad.js';

const CATEGORY_BOOSTS = {
  'farmer-market': 0.10,
  'fermerskiy-rynok': 0.10,
  'lichnye-veshchi': 0.05,
  'elektronika': 0.03,
};

const WEIGHTS = {
  distance: 0.4,
  freshness: 0.3,
  engagement: 0.3,
};

const MAX_RADIUS_KM = 50;
const FRESHNESS_DECAY_HOURS = 48;

class FastMarketScoringService {
  calculateDistanceScore(distanceKm, maxRadiusKm = MAX_RADIUS_KM) {
    if (distanceKm == null || distanceKm < 0) return 0;
    return Math.max(0, 1 - (distanceKm / maxRadiusKm));
  }

  calculateFreshnessScore(createdAt) {
    if (!createdAt) return 0;
    const now = new Date();
    const created = new Date(createdAt);
    const ageInHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return Math.exp(-ageInHours / FRESHNESS_DECAY_HOURS);
  }

  calculateEngagementScore(stats) {
    if (!stats) return 0.1;
    
    const viewsWeight = 1;
    const contactWeight = 5;
    const favoritesWeight = 3;
    
    const rawScore = 
      (stats.viewsLast72h || 0) * viewsWeight +
      (stats.contactClicks || 0) * contactWeight +
      (stats.favoritesCount || 0) * favoritesWeight;
    
    if (rawScore === 0) return 0.1;
    
    const logScore = Math.log10(1 + rawScore) / Math.log10(101);
    return Math.min(1, Math.max(0.1, logScore));
  }

  getCategoryBoost(categoryId, subcategoryId) {
    const boost = CATEGORY_BOOSTS[categoryId] || CATEGORY_BOOSTS[subcategoryId] || 0;
    return boost;
  }

  calculateFastMarketScore(ad, options = {}) {
    const { userLocation = null, stats = null, distanceKm = null } = options;
    
    let distance = distanceKm;
    if (distance == null && userLocation && ad.location?.lat && ad.location?.lng) {
      distance = this.haversineDistance(
        userLocation.lat, userLocation.lng,
        ad.location.lat, ad.location.lng
      );
    }
    
    const scoreDistance = this.calculateDistanceScore(distance);
    const scoreFresh = this.calculateFreshnessScore(ad.createdAt);
    const scoreEngagement = this.calculateEngagementScore(stats);
    const categoryBoost = this.getCategoryBoost(ad.categoryId, ad.subcategoryId);
    
    const baseScore = 
      WEIGHTS.distance * scoreDistance +
      WEIGHTS.freshness * scoreFresh +
      WEIGHTS.engagement * scoreEngagement;
    
    const finalScore = baseScore * (1 + categoryBoost);
    
    return {
      fastMarketScore: Math.round(finalScore * 1000) / 1000,
      components: {
        distance: Math.round(scoreDistance * 100) / 100,
        freshness: Math.round(scoreFresh * 100) / 100,
        engagement: Math.round(scoreEngagement * 100) / 100,
        categoryBoost: categoryBoost,
      },
    };
  }

  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  async getStatsForAds(adIds) {
    if (!adIds || adIds.length === 0) return new Map();
    
    const stats = await AdStats.find({ adId: { $in: adIds } }).lean();
    const statsMap = new Map();
    
    for (const stat of stats) {
      statsMap.set(stat.adId.toString(), stat);
    }
    
    return statsMap;
  }

  async scoreAndSortAds(ads, userLocation = null) {
    if (!ads || ads.length === 0) return [];
    
    const adIds = ads.map(ad => ad._id);
    const statsMap = await this.getStatsForAds(adIds);
    
    const scoredAds = ads.map(ad => {
      const stats = statsMap.get(ad._id.toString());
      const distanceKm = ad.distanceKm ?? null;
      
      const { fastMarketScore } = this.calculateFastMarketScore(ad, {
        userLocation,
        stats,
        distanceKm,
      });
      
      return {
        ...ad,
        fastMarketScore,
      };
    });
    
    scoredAds.sort((a, b) => b.fastMarketScore - a.fastMarketScore);
    
    return scoredAds;
  }

  async updateCachedScores(batchSize = 100) {
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - 10 * 60 * 1000);
    
    const staleStats = await AdStats.find({
      $or: [
        { lastFastMarketScoreAt: null },
        { lastFastMarketScoreAt: { $lt: staleThreshold } },
      ],
    }).limit(batchSize);
    
    let updated = 0;
    
    for (const stat of staleStats) {
      const ad = await Ad.findById(stat.adId).lean();
      if (!ad) continue;
      
      const { fastMarketScore } = this.calculateFastMarketScore(ad, { stats: stat });
      
      await AdStats.updateOne(
        { _id: stat._id },
        {
          $set: {
            lastFastMarketScore: fastMarketScore,
            lastFastMarketScoreAt: now,
          },
        }
      );
      
      updated++;
    }
    
    return updated;
  }

  async trackAdView(adId, userId = null) {
    return AdStats.incrementViews(adId, userId);
  }

  async trackContactClick(adId, userId = null, type = 'telegram') {
    return AdStats.incrementContactClicks(adId, userId, type);
  }

  async trackFavoriteChange(adId, added = true) {
    return AdStats.incrementFavorites(adId, added ? 1 : -1);
  }
}

export default new FastMarketScoringService();
