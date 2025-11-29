import Ad from '../../models/Ad.js';
import UserActivity from '../../models/UserActivity.js';

class RecommendationService {
  calculateTextSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    
    if (words1.size === 0 || words2.size === 0) return 0;
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  calculatePriceSimilarity(price1, price2, tolerance = 0.3) {
    if (!price1 || !price2) return 0.5;
    
    const ratio = Math.min(price1, price2) / Math.max(price1, price2);
    return ratio >= (1 - tolerance) ? ratio : 0;
  }

  async getSimilarAds(input) {
    try {
      const { adId, limit = 6 } = input;
      
      const sourceAd = await Ad.findById(adId).lean();
      if (!sourceAd) {
        return { success: false, error: 'Ad not found', data: { ads: [] } };
      }
      
      const query = {
        _id: { $ne: sourceAd._id },
        status: 'active',
        moderationStatus: 'approved'
      };
      
      if (sourceAd.categoryId) {
        query.categoryId = sourceAd.categoryId;
      }
      
      if (sourceAd.price) {
        const minPrice = sourceAd.price * 0.5;
        const maxPrice = sourceAd.price * 1.5;
        query.price = { $gte: minPrice, $lte: maxPrice };
      }
      
      if (sourceAd.location?.coordinates) {
        query['location.coordinates'] = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: sourceAd.location.coordinates
            },
            $maxDistance: 50000
          }
        };
      }
      
      let candidates = [];
      try {
        candidates = await Ad.find(query).limit(limit * 3).lean();
      } catch (geoError) {
        delete query['location.coordinates'];
        candidates = await Ad.find(query).limit(limit * 3).lean();
      }
      
      const scored = candidates.map(ad => {
        let score = 0;
        
        const titleSim = this.calculateTextSimilarity(sourceAd.title, ad.title);
        score += titleSim * 30;
        
        const descSim = this.calculateTextSimilarity(sourceAd.description, ad.description);
        score += descSim * 20;
        
        const priceSim = this.calculatePriceSimilarity(sourceAd.price, ad.price);
        score += priceSim * 25;
        
        if (sourceAd.subcategoryId && ad.subcategoryId === sourceAd.subcategoryId) {
          score += 15;
        }
        
        if (sourceAd.cityCode && ad.cityCode === sourceAd.cityCode) {
          score += 10;
        }
        
        return { ...ad, similarityScore: score };
      });
      
      scored.sort((a, b) => b.similarityScore - a.similarityScore);
      
      return {
        success: true,
        data: {
          ads: scored.slice(0, limit),
          sourceAdId: adId
        }
      };
    } catch (error) {
      console.error('[RecommendationService] getSimilarAds error:', error);
      return {
        success: false,
        error: error.message,
        data: { ads: [] }
      };
    }
  }

  async getPersonalFeed(input) {
    try {
      const { userId, telegramId, lat, lng, radiusKm = 10, limit = 20 } = input;
      
      let userActivity = null;
      if (telegramId) {
        userActivity = await UserActivity.findOne({ telegramId }).lean().catch(() => null);
      }
      
      const query = {
        status: 'active',
        moderationStatus: 'approved'
      };
      
      if (lat && lng) {
        query['location.coordinates'] = {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: radiusKm * 1000
          }
        };
      }
      
      let personalizedAds = [];
      
      if (userActivity?.viewedCategories?.length > 0) {
        const topCategories = userActivity.viewedCategories
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map(c => c.categoryId);
        
        const categoryQuery = { ...query, categoryId: { $in: topCategories } };
        
        try {
          personalizedAds = await Ad.find(categoryQuery)
            .sort({ createdAt: -1 })
            .limit(Math.floor(limit * 0.6))
            .lean();
        } catch (e) {
          delete categoryQuery['location.coordinates'];
          personalizedAds = await Ad.find(categoryQuery)
            .sort({ createdAt: -1 })
            .limit(Math.floor(limit * 0.6))
            .lean();
        }
      }
      
      const remainingLimit = limit - personalizedAds.length;
      let trendingAds = [];
      
      if (remainingLimit > 0) {
        const trendingQuery = { ...query };
        const personalizedIds = personalizedAds.map(a => a._id);
        if (personalizedIds.length > 0) {
          trendingQuery._id = { $nin: personalizedIds };
        }
        
        try {
          trendingAds = await Ad.find(trendingQuery)
            .sort({ views: -1, createdAt: -1 })
            .limit(remainingLimit)
            .lean();
        } catch (e) {
          delete trendingQuery['location.coordinates'];
          trendingAds = await Ad.find(trendingQuery)
            .sort({ views: -1, createdAt: -1 })
            .limit(remainingLimit)
            .lean();
        }
      }
      
      const combinedAds = [...personalizedAds, ...trendingAds];
      
      for (let i = combinedAds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * 0.3 * i);
        if (j !== i && j < combinedAds.length) {
          [combinedAds[i], combinedAds[j]] = [combinedAds[j], combinedAds[i]];
        }
      }
      
      return {
        success: true,
        data: {
          ads: combinedAds,
          isPersonalized: !!userActivity,
          totalCount: combinedAds.length
        }
      };
    } catch (error) {
      console.error('[RecommendationService] getPersonalFeed error:', error);
      return {
        success: false,
        error: error.message,
        data: { ads: [], isPersonalized: false }
      };
    }
  }

  async getTrendingNearby(input) {
    try {
      const { lat, lng, radiusKm = 5, limit = 10 } = input;
      
      const query = {
        status: 'active',
        moderationStatus: 'approved'
      };
      
      if (lat && lng) {
        query['location.coordinates'] = {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: radiusKm * 1000
          }
        };
      }
      
      let trendingAds = [];
      
      try {
        trendingAds = await Ad.find(query)
          .sort({ views: -1, contactClicks: -1, createdAt: -1 })
          .limit(limit)
          .lean();
      } catch (e) {
        delete query['location.coordinates'];
        trendingAds = await Ad.find(query)
          .sort({ views: -1, contactClicks: -1, createdAt: -1 })
          .limit(limit)
          .lean();
      }
      
      return {
        success: true,
        data: {
          ads: trendingAds,
          radiusKm,
          location: lat && lng ? { lat, lng } : null
        }
      };
    } catch (error) {
      console.error('[RecommendationService] getTrendingNearby error:', error);
      return {
        success: false,
        error: error.message,
        data: { ads: [] }
      };
    }
  }

  async trackUserActivity(input) {
    try {
      const { telegramId, action, adId, categoryId, searchQuery } = input;
      
      if (!telegramId) return { success: false, error: 'telegramId required' };
      
      let activity = await UserActivity.findOne({ telegramId });
      
      if (!activity) {
        activity = new UserActivity({
          telegramId,
          viewedCategories: [],
          viewedAds: [],
          searchQueries: [],
          lastActive: new Date()
        });
      }
      
      activity.lastActive = new Date();
      
      if (action === 'view_ad' && adId) {
        if (!activity.viewedAds) activity.viewedAds = [];
        activity.viewedAds.unshift({ adId, viewedAt: new Date() });
        activity.viewedAds = activity.viewedAds.slice(0, 100);
      }
      
      if (action === 'view_category' && categoryId) {
        if (!activity.viewedCategories) activity.viewedCategories = [];
        const existing = activity.viewedCategories.find(c => c.categoryId === categoryId);
        if (existing) {
          existing.count += 1;
          existing.lastViewed = new Date();
        } else {
          activity.viewedCategories.push({ categoryId, count: 1, lastViewed: new Date() });
        }
      }
      
      if (action === 'search' && searchQuery) {
        if (!activity.searchQueries) activity.searchQueries = [];
        activity.searchQueries.unshift({ query: searchQuery, searchedAt: new Date() });
        activity.searchQueries = activity.searchQueries.slice(0, 50);
      }
      
      await activity.save();
      
      return { success: true };
    } catch (error) {
      console.error('[RecommendationService] trackUserActivity error:', error);
      return { success: false, error: error.message };
    }
  }
}

const recommendationService = new RecommendationService();

export default recommendationService;
export { RecommendationService };
