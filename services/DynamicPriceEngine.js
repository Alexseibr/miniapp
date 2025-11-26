import Ad from '../models/Ad.js';
import GeoEvent from '../models/GeoEvent.js';
import * as PriceAnalyticsService from './PriceAnalyticsService.js';
import HotspotEngine from './geo/HotspotEngine.js';
import SeasonalInsightService from './geo/SeasonalInsightService.js';

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map();

const CATEGORY_TIME_MODIFIERS = {
  'bakery': { morning: 1.15, evening: 0.9 },
  'farmer-bakery': { morning: 1.15, evening: 0.9 },
  'flowers': { morning: 1.1, evening: 0.95 },
  'farmer-flowers': { morning: 1.1, evening: 0.95 },
  'berries': { morning: 1.1, evening: 0.95 },
  'farmer-berries': { morning: 1.1, evening: 0.95 },
};

const SEASON_PEAK_MULTIPLIERS = {
  'berries': { months: [5, 6, 7, 8], peakMultiplier: 1.0, offPeakMultiplier: 1.3 },
  'farmer-berries': { months: [5, 6, 7, 8], peakMultiplier: 1.0, offPeakMultiplier: 1.3 },
  'vegetables': { months: [6, 7, 8, 9], peakMultiplier: 1.0, offPeakMultiplier: 1.2 },
  'farmer-vegetables': { months: [6, 7, 8, 9], peakMultiplier: 1.0, offPeakMultiplier: 1.2 },
  'fruits': { months: [7, 8, 9, 10], peakMultiplier: 1.0, offPeakMultiplier: 1.25 },
  'farmer-fruits': { months: [7, 8, 9, 10], peakMultiplier: 1.0, offPeakMultiplier: 1.25 },
  'flowers': { months: [2, 3, 4, 5], peakMultiplier: 1.15, offPeakMultiplier: 1.0 },
  'farmer-flowers': { months: [2, 3, 4, 5], peakMultiplier: 1.15, offPeakMultiplier: 1.0 },
  'honey': { months: [7, 8, 9], peakMultiplier: 0.95, offPeakMultiplier: 1.1 },
  'farmer-honey': { months: [7, 8, 9], peakMultiplier: 0.95, offPeakMultiplier: 1.1 },
  'mushrooms': { months: [8, 9, 10], peakMultiplier: 0.95, offPeakMultiplier: 1.2 },
  'farmer-mushrooms': { months: [8, 9, 10], peakMultiplier: 0.95, offPeakMultiplier: 1.2 },
};

class DynamicPriceEngine {
  constructor() {
    this.hotspotEngine = HotspotEngine;
    this.seasonalService = SeasonalInsightService;
  }

  getCacheKey(prefix, params) {
    return `${prefix}:${JSON.stringify(params)}`;
  }

  getFromCache(key) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return entry.data;
    }
    cache.delete(key);
    return null;
  }

  setCache(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
  }

  async calculatePrice(ad) {
    if (!ad || !ad._id) {
      return { success: false, error: 'Invalid ad' };
    }

    const cacheKey = this.getCacheKey('price', { adId: ad._id.toString() });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const marketData = await PriceAnalyticsService.getStatsForAdData(ad);
      
      if (!marketData || !marketData.hasMarketData) {
        return {
          success: true,
          hasMarketData: false,
          recommended: null,
          marketMin: null,
          marketMax: null,
          marketAvg: null,
          position: 'unknown',
          confidence: 0,
          reasons: ['Недостаточно данных для анализа рынка'],
        };
      }

      const seasonFactor = this.getSeasonFactor(ad.categoryId);
      const timeFactor = this.getTimeOfDayFactor(ad.categoryId);
      const demandScore = await this.getDemandScore(ad);
      const qualityFactor = this.calculateQualityFactor(ad);
      const competitionFactor = await this.getCompetitionFactor(ad, marketData.count);

      const avgPrice = marketData.avgPrice;
      const baseRecommended = avgPrice * seasonFactor * timeFactor * demandScore * qualityFactor * competitionFactor;
      const recommended = Math.round(baseRecommended);

      const marketMin = marketData.minPrice;
      const marketMax = marketData.maxPrice;

      const position = this.calculatePosition(ad.price, recommended, avgPrice);

      const diffPercent = avgPrice ? ((ad.price - avgPrice) / avgPrice) * 100 : 0;

      const confidence = this.calculateConfidence(marketData.count, demandScore);

      const reasons = this.generateReasons({
        seasonFactor,
        timeFactor,
        demandScore,
        qualityFactor,
        competitionFactor,
        diffPercent,
        position,
        marketData,
        ad,
      });

      const result = {
        success: true,
        hasMarketData: true,
        recommended,
        marketMin,
        marketMax,
        marketAvg: avgPrice,
        medianPrice: marketData.medianPrice,
        position,
        confidence: Math.round(confidence * 100) / 100,
        diffPercent: Math.round(diffPercent * 10) / 10,
        reasons,
        factors: {
          seasonFactor: Math.round(seasonFactor * 100) / 100,
          timeFactor: Math.round(timeFactor * 100) / 100,
          demandScore: Math.round(demandScore * 100) / 100,
          qualityFactor: Math.round(qualityFactor * 100) / 100,
          competitionFactor: Math.round(competitionFactor * 100) / 100,
        },
        sampleSize: marketData.count,
        windowDays: marketData.windowDays,
        impulseRecommendations: this.getImpulseRecommendations(ad, position, demandScore, timeFactor),
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[DynamicPriceEngine] calculatePrice error:', error);
      return { success: false, error: error.message };
    }
  }

  getSeasonFactor(categoryId) {
    if (!categoryId) return 1.0;
    
    const config = SEASON_PEAK_MULTIPLIERS[categoryId];
    if (!config) return 1.0;
    
    const currentMonth = new Date().getMonth();
    const isInSeason = config.months.includes(currentMonth);
    
    return isInSeason ? config.peakMultiplier : config.offPeakMultiplier;
  }

  getTimeOfDayFactor(categoryId) {
    if (!categoryId) return 1.0;
    
    const config = CATEGORY_TIME_MODIFIERS[categoryId];
    if (!config) return 1.0;
    
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 12) {
      return config.morning || 1.0;
    } else if (hour >= 18 && hour < 22) {
      return config.evening || 1.0;
    }
    
    return 1.0;
  }

  async getDemandScore(ad) {
    if (!ad.location?.lat || !ad.location?.lng) {
      return 1.0;
    }

    try {
      const result = await this.hotspotEngine.getDemandHotspots({
        lat: ad.location.lat,
        lng: ad.location.lng,
        radiusKm: 5,
        hours: 24,
      });

      if (!result.success || !result.data?.hotspots?.length) {
        return 1.0;
      }

      const categoryHotspots = result.data.hotspots.filter(h => 
        h.topCategories?.includes(ad.categoryId)
      );

      if (categoryHotspots.length === 0) {
        return 1.0;
      }

      const avgDemand = categoryHotspots.reduce((sum, h) => sum + (h.demandScore || 0), 0) / categoryHotspots.length;
      
      const normalizedDemand = 1 + (avgDemand / 100) * 0.2;
      return Math.min(Math.max(normalizedDemand, 0.9), 1.3);
    } catch (error) {
      console.error('[DynamicPriceEngine] getDemandScore error:', error);
      return 1.0;
    }
  }

  calculateQualityFactor(ad) {
    let score = 1.0;

    const photoCount = ad.photos?.length || 0;
    if (photoCount === 0) {
      score -= 0.1;
    } else if (photoCount >= 3) {
      score += 0.05;
    } else if (photoCount >= 5) {
      score += 0.1;
    }

    const descLength = ad.description?.length || 0;
    if (descLength < 50) {
      score -= 0.05;
    } else if (descLength >= 200) {
      score += 0.05;
    }

    const titleLength = ad.title?.length || 0;
    if (titleLength < 10) {
      score -= 0.03;
    } else if (titleLength >= 30 && titleLength <= 80) {
      score += 0.02;
    }

    if (ad.contactName || ad.contactPhone || ad.sellerPhone) {
      score += 0.02;
    }

    return Math.min(Math.max(score, 0.85), 1.15);
  }

  async getCompetitionFactor(ad, marketSampleSize) {
    if (!ad.location?.lat || !ad.location?.lng) {
      return 1.0;
    }

    try {
      const nearbyAds = await Ad.countDocuments({
        categoryId: ad.categoryId,
        status: 'active',
        moderationStatus: 'approved',
        _id: { $ne: ad._id },
        'location.coordinates': {
          $geoWithin: {
            $centerSphere: [[ad.location.lng, ad.location.lat], 3 / 6378.1]
          }
        }
      });

      if (nearbyAds <= 2) {
        return 1.15;
      } else if (nearbyAds <= 5) {
        return 1.08;
      } else if (nearbyAds <= 10) {
        return 1.0;
      } else if (nearbyAds <= 20) {
        return 0.95;
      } else {
        return 0.9;
      }
    } catch (error) {
      console.error('[DynamicPriceEngine] getCompetitionFactor error:', error);
      return 1.0;
    }
  }

  calculatePosition(currentPrice, recommended, avgPrice) {
    if (!currentPrice || !avgPrice) return 'unknown';

    const diffFromAvg = ((currentPrice - avgPrice) / avgPrice) * 100;

    if (diffFromAvg <= -10) {
      return 'low';
    } else if (diffFromAvg >= 15) {
      return 'high';
    } else {
      return 'optimal';
    }
  }

  calculateConfidence(sampleSize, demandScore) {
    let confidence = 0.5;

    if (sampleSize >= 50) {
      confidence += 0.3;
    } else if (sampleSize >= 20) {
      confidence += 0.2;
    } else if (sampleSize >= 10) {
      confidence += 0.1;
    } else if (sampleSize >= 5) {
      confidence += 0.05;
    }

    if (demandScore > 1.1) {
      confidence += 0.1;
    }

    confidence += 0.1;

    return Math.min(confidence, 0.95);
  }

  generateReasons({ seasonFactor, timeFactor, demandScore, qualityFactor, competitionFactor, diffPercent, position, marketData, ad }) {
    const reasons = [];

    if (diffPercent > 15) {
      reasons.push(`Ваша цена выше рынка на ${Math.round(diffPercent)}%`);
    } else if (diffPercent < -10) {
      reasons.push(`Ваша цена ниже рынка на ${Math.abs(Math.round(diffPercent))}%`);
    } else {
      reasons.push('Ваша цена соответствует рынку');
    }

    if (demandScore >= 1.1) {
      reasons.push('Высокий спрос в вашем районе');
    } else if (demandScore < 0.95) {
      reasons.push('Спрос в районе ниже среднего');
    }

    if (competitionFactor >= 1.1) {
      reasons.push('Мало конкурентов поблизости — можно поднять цену');
    } else if (competitionFactor < 0.95) {
      reasons.push('Много конкурентов — конкурентная цена важна');
    }

    if (seasonFactor > 1.05) {
      reasons.push('Сезонный пик — повышенный спрос');
    } else if (seasonFactor < 0.95) {
      reasons.push('Несезон — спрос ниже обычного');
    }

    if (timeFactor > 1.05) {
      reasons.push('Лучшее время для продажи — утренние часы');
    } else if (timeFactor < 0.95) {
      reasons.push('Вечер — спрос снижен');
    }

    if (qualityFactor < 0.95) {
      if (!ad.photos?.length) {
        reasons.push('Добавьте фото для повышения цены');
      }
      if ((ad.description?.length || 0) < 100) {
        reasons.push('Расширьте описание — это повысит привлекательность');
      }
    }

    return reasons;
  }

  getImpulseRecommendations(ad, position, demandScore, timeFactor) {
    const impulses = [];

    if (demandScore >= 1.15 && position !== 'high') {
      impulses.push({
        type: 'raise',
        urgency: 'high',
        message: '🔥 Спрос вырос — можно поднять цену на 10-15%',
        icon: 'trending_up',
      });
    }

    if (timeFactor > 1.1) {
      impulses.push({
        type: 'timing',
        urgency: 'medium',
        message: '⏰ Сейчас пик продаж — идеальное время',
        icon: 'schedule',
      });
    }

    if (position === 'low' && demandScore >= 1.0) {
      impulses.push({
        type: 'raise',
        urgency: 'medium',
        message: '💰 Ваша цена ниже рынка — можно поднять',
        icon: 'attach_money',
      });
    }

    if (position === 'high' && demandScore < 1.0) {
      impulses.push({
        type: 'lower',
        urgency: 'medium',
        message: '📉 Рынок просел — рассмотрите снижение цены',
        icon: 'trending_down',
      });
    }

    return impulses;
  }

  async getPriceHistory(adId, days = 7) {
    try {
      const ad = await Ad.findById(adId).select('priceHistory price createdAt');
      if (!ad) return null;

      const history = ad.priceHistory || [];
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const filtered = history.filter(h => new Date(h.changedAt) >= since);
      
      if (filtered.length === 0 && ad.price) {
        filtered.push({
          oldPrice: ad.price,
          newPrice: ad.price,
          changedAt: ad.createdAt,
        });
      }

      return filtered.map(h => ({
        price: h.newPrice,
        date: h.changedAt,
      }));
    } catch (error) {
      console.error('[DynamicPriceEngine] getPriceHistory error:', error);
      return [];
    }
  }

  async getMarketTrend(categoryId, lat, lng, days = 7) {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const midPoint = new Date(Date.now() - (days / 2) * 24 * 60 * 60 * 1000);

      const baseMatch = {
        categoryId,
        status: 'active',
        moderationStatus: 'approved',
        price: { $gt: 0 },
      };

      if (lat && lng) {
        baseMatch['location.coordinates'] = {
          $geoWithin: {
            $centerSphere: [[lng, lat], 10 / 6378.1]
          }
        };
      }

      const [firstHalf, secondHalf] = await Promise.all([
        Ad.aggregate([
          { $match: { ...baseMatch, createdAt: { $gte: since, $lt: midPoint } } },
          { $group: { _id: null, avgPrice: { $avg: '$price' }, count: { $sum: 1 } } }
        ]),
        Ad.aggregate([
          { $match: { ...baseMatch, createdAt: { $gte: midPoint } } },
          { $group: { _id: null, avgPrice: { $avg: '$price' }, count: { $sum: 1 } } }
        ])
      ]);

      const firstAvg = firstHalf[0]?.avgPrice || 0;
      const secondAvg = secondHalf[0]?.avgPrice || 0;

      if (!firstAvg || !secondAvg) {
        return { trend: 'stable', changePercent: 0 };
      }

      const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

      let trend = 'stable';
      if (changePercent >= 5) trend = 'rising';
      else if (changePercent <= -5) trend = 'falling';

      return {
        trend,
        changePercent: Math.round(changePercent * 10) / 10,
        firstPeriodAvg: Math.round(firstAvg),
        secondPeriodAvg: Math.round(secondAvg),
      };
    } catch (error) {
      console.error('[DynamicPriceEngine] getMarketTrend error:', error);
      return { trend: 'unknown', changePercent: 0 };
    }
  }

  async recalculateForSeller(sellerTelegramId) {
    try {
      const ads = await Ad.find({
        sellerTelegramId,
        status: 'active',
        moderationStatus: 'approved',
      }).limit(50);

      const results = [];
      for (const ad of ads) {
        const priceData = await this.calculatePrice(ad);
        results.push({
          adId: ad._id.toString(),
          title: ad.title,
          currentPrice: ad.price,
          ...priceData,
        });
      }

      return { success: true, count: results.length, ads: results };
    } catch (error) {
      console.error('[DynamicPriceEngine] recalculateForSeller error:', error);
      return { success: false, error: error.message };
    }
  }

  async getMarketAnalytics(categoryId, lat, lng, radiusKm = 10) {
    try {
      const [demandHotspots, trend, seasonalTrends] = await Promise.all([
        lat && lng ? this.hotspotEngine.getDemandHotspots({ lat, lng, radiusKm, hours: 24 }) : null,
        this.getMarketTrend(categoryId, lat, lng, 7),
        this.seasonalService.getSeasonalTrends({ lat, lng, radiusKm }),
      ]);

      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay();

      return {
        demand: demandHotspots?.data?.summary || null,
        trend,
        seasonal: seasonalTrends?.data || null,
        timing: {
          currentHour: hour,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          isMorningPeak: hour >= 7 && hour < 11,
          isEveningPeak: hour >= 18 && hour < 21,
        },
      };
    } catch (error) {
      console.error('[DynamicPriceEngine] getMarketAnalytics error:', error);
      return null;
    }
  }

  clearCache() {
    cache.clear();
  }
}

export default new DynamicPriceEngine();
