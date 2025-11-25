import Ad from '../../models/Ad.js';
import GeoEvent from '../../models/GeoEvent.js';
import Season from '../../models/Season.js';

const SEASONAL_CATEGORIES = {
  berries: {
    months: [5, 6, 7, 8],
    keywords: ['клубника', 'малина', 'черника', 'голубика', 'смородина', 'крыжовник', 'земляника', 'ягоды'],
    emoji: '🍓',
    label: 'Сезон ягод'
  },
  vegetables: {
    months: [6, 7, 8, 9, 10],
    keywords: ['огурцы', 'помидоры', 'картошка', 'морковь', 'свекла', 'капуста', 'кабачки', 'тыква', 'овощи'],
    emoji: '🥒',
    label: 'Урожай овощей'
  },
  fruits: {
    months: [7, 8, 9, 10],
    keywords: ['яблоки', 'груши', 'сливы', 'вишня', 'черешня', 'абрикос', 'персик', 'фрукты'],
    emoji: '🍎',
    label: 'Сезон фруктов'
  },
  flowers: {
    months: [2, 3, 4, 5],
    keywords: ['тюльпаны', 'розы', 'нарциссы', 'гиацинты', 'подснежники', 'пионы', 'цветы', 'букет'],
    emoji: '🌷',
    label: 'Весенние цветы'
  },
  bakery: {
    weekends: true,
    keywords: ['выпечка', 'пирог', 'булочки', 'хлеб', 'торт', 'кулич', 'печенье', 'пирожки'],
    emoji: '🥐',
    label: 'Свежая выпечка'
  },
  honey: {
    months: [7, 8, 9],
    keywords: ['мёд', 'мед', 'соты', 'прополис', 'пчелопродукты'],
    emoji: '🍯',
    label: 'Свежий мёд'
  },
  mushrooms: {
    months: [8, 9, 10],
    keywords: ['грибы', 'белые', 'лисички', 'подберезовики', 'опята', 'боровики'],
    emoji: '🍄',
    label: 'Грибной сезон'
  },
  preserves: {
    months: [8, 9, 10, 11],
    keywords: ['варенье', 'соленья', 'закатки', 'маринады', 'компот', 'джем', 'заготовки'],
    emoji: '🫙',
    label: 'Домашние заготовки'
  },
  seedlings: {
    months: [3, 4, 5],
    keywords: ['рассада', 'саженцы', 'семена', 'рассада помидор', 'рассада огурцов'],
    emoji: '🌱',
    label: 'Рассада и саженцы'
  },
  dairy: {
    allYear: true,
    keywords: ['молоко', 'творог', 'сметана', 'сыр', 'кефир', 'масло', 'йогурт'],
    emoji: '🥛',
    label: 'Фермерская молочка'
  },
  meat: {
    allYear: true,
    keywords: ['мясо', 'курица', 'свинина', 'говядина', 'баранина', 'фарш', 'колбаса'],
    emoji: '🥩',
    label: 'Фермерское мясо'
  },
  eggs: {
    allYear: true,
    keywords: ['яйца', 'яйцо', 'перепелиные'],
    emoji: '🥚',
    label: 'Домашние яйца'
  }
};

class SeasonalInsightService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 30 * 60 * 1000;
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

  getCurrentSeasons() {
    const now = new Date();
    const month = now.getMonth();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    const activeSeasons = [];
    
    Object.entries(SEASONAL_CATEGORIES).forEach(([key, config]) => {
      let isActive = false;
      let relevanceScore = 0;
      
      if (config.months && config.months.includes(month)) {
        isActive = true;
        const midPoint = config.months[Math.floor(config.months.length / 2)];
        relevanceScore = 1 - Math.abs(month - midPoint) / config.months.length;
      }
      
      if (config.weekends && isWeekend) {
        isActive = true;
        relevanceScore = 1;
      }
      
      if (config.allYear) {
        isActive = true;
        relevanceScore = 0.5;
      }
      
      if (isActive) {
        activeSeasons.push({
          code: key,
          label: config.label,
          emoji: config.emoji,
          keywords: config.keywords,
          relevanceScore,
          isWeekendBoost: config.weekends && isWeekend
        });
      }
    });
    
    return activeSeasons.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  async getSeasonalTrends(input = {}) {
    const { lat, lng, radiusKm = 20 } = input;
    
    const cacheKey = this.getCacheKey('seasonal-trends', { 
      lat: lat ? Math.round(lat * 10) : null, 
      lng: lng ? Math.round(lng * 10) : null, 
      radiusKm 
    });
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      const currentSeasons = this.getCurrentSeasons();
      const trends = [];
      
      for (const season of currentSeasons.slice(0, 5)) {
        const keywordsRegex = season.keywords.join('|');
        
        const matchQuery = {
          status: 'active',
          moderationStatus: 'approved',
          title: { $regex: keywordsRegex, $options: 'i' }
        };
        
        if (lat && lng) {
          matchQuery['location.coordinates'] = {
            $geoWithin: {
              $centerSphere: [[lng, lat], radiusKm / 6378.1]
            }
          };
        }
        
        const [adsCount, recentAdsCount] = await Promise.all([
          Ad.countDocuments(matchQuery),
          Ad.countDocuments({
            ...matchQuery,
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          })
        ]);
        
        if (adsCount > 0) {
          trends.push({
            code: season.code,
            label: season.label,
            emoji: season.emoji,
            totalAds: adsCount,
            newToday: recentAdsCount,
            trend: recentAdsCount > 5 ? 'rising' : recentAdsCount > 0 ? 'stable' : 'low',
            relevanceScore: season.relevanceScore,
            isWeekendBoost: season.isWeekendBoost
          });
        }
      }
      
      const result = {
        success: true,
        data: {
          trends: trends.sort((a, b) => b.totalAds - a.totalAds),
          currentSeasons: currentSeasons.map(s => ({
            code: s.code,
            label: s.label,
            emoji: s.emoji
          }))
        }
      };
      
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[SeasonalInsightService] getSeasonalTrends error:', error);
      return { success: false, error: error.message, data: { trends: [], currentSeasons: [] } };
    }
  }

  async getSeasonalAds(input) {
    const { lat, lng, radiusKm = 10, seasonCode, limit = 20 } = input;
    
    try {
      const season = SEASONAL_CATEGORIES[seasonCode];
      if (!season) {
        return { success: false, error: 'Unknown season code', data: { ads: [] } };
      }
      
      const keywordsRegex = season.keywords.join('|');
      
      const query = {
        status: 'active',
        moderationStatus: 'approved',
        title: { $regex: keywordsRegex, $options: 'i' }
      };
      
      if (lat && lng) {
        query['location.coordinates'] = {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusKm / 6378.1]
          }
        };
      }
      
      const ads = await Ad.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      
      const formattedAds = ads.map(ad => {
        let distanceKm = null;
        if (lat && lng && ad.location?.coordinates) {
          const [adLng, adLat] = ad.location.coordinates;
          const R = 6371;
          const dLat = (adLat - lat) * Math.PI / 180;
          const dLng = (adLng - lng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat * Math.PI / 180) * Math.cos(adLat * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2);
          distanceKm = (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
        }
        
        return {
          _id: ad._id.toString(),
          title: ad.title,
          price: ad.price,
          currency: ad.currency,
          photos: ad.photos,
          distanceKm,
          isSeasonal: true,
          seasonCode
        };
      });
      
      return {
        success: true,
        data: {
          ads: formattedAds,
          season: {
            code: seasonCode,
            label: season.label,
            emoji: season.emoji
          }
        }
      };
    } catch (error) {
      console.error('[SeasonalInsightService] getSeasonalAds error:', error);
      return { success: false, error: error.message, data: { ads: [] } };
    }
  }

  async getSeasonalDemand(input) {
    const { lat, lng, radiusKm = 20, hours = 48 } = input;
    
    try {
      const currentSeasons = this.getCurrentSeasons();
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const demandByCategory = [];
      
      for (const season of currentSeasons.slice(0, 6)) {
        const keywordsRegex = season.keywords.join('|');
        
        const matchQuery = {
          type: { $in: ['search', 'empty_search'] },
          createdAt: { $gte: since },
          'payload.query': { $regex: keywordsRegex, $options: 'i' }
        };
        
        if (lat && lng) {
          matchQuery['location'] = {
            $geoWithin: {
              $centerSphere: [[lng, lat], radiusKm / 6378.1]
            }
          };
        }
        
        const searchCount = await GeoEvent.countDocuments(matchQuery);
        
        if (searchCount > 0) {
          demandByCategory.push({
            code: season.code,
            label: season.label,
            emoji: season.emoji,
            searchCount,
            demandLevel: searchCount > 50 ? 'high' : searchCount > 10 ? 'medium' : 'low'
          });
        }
      }
      
      return {
        success: true,
        data: {
          demand: demandByCategory.sort((a, b) => b.searchCount - a.searchCount),
          period: { hours, since }
        }
      };
    } catch (error) {
      console.error('[SeasonalInsightService] getSeasonalDemand error:', error);
      return { success: false, error: error.message, data: { demand: [] } };
    }
  }

  async generateSeasonalHints(input) {
    const { lat, lng, radiusKm = 10, role = 'buyer' } = input;
    
    try {
      const [trendsResult, demandResult] = await Promise.all([
        this.getSeasonalTrends({ lat, lng, radiusKm }),
        this.getSeasonalDemand({ lat, lng, radiusKm })
      ]);
      
      const hints = [];
      
      if (trendsResult.success && trendsResult.data.trends.length > 0) {
        const topTrend = trendsResult.data.trends[0];
        
        if (role === 'buyer') {
          hints.push({
            type: 'season_active',
            emoji: topTrend.emoji,
            text: `${topTrend.label} — ${topTrend.totalAds} предложений рядом`,
            actionLabel: 'Посмотреть',
            actionData: { seasonCode: topTrend.code }
          });
          
          if (topTrend.newToday > 0) {
            hints.push({
              type: 'new_seasonal',
              emoji: '✨',
              text: `+${topTrend.newToday} новых за сегодня: ${topTrend.label.toLowerCase()}`,
              actionLabel: 'Смотреть новые',
              actionData: { seasonCode: topTrend.code, sortBy: 'newest' }
            });
          }
        } else {
          if (demandResult.success && demandResult.data.demand.length > 0) {
            const topDemand = demandResult.data.demand[0];
            hints.push({
              type: 'demand_hint',
              emoji: topDemand.emoji,
              text: `Высокий спрос на ${topDemand.label.toLowerCase()}! ${topDemand.searchCount} запросов`,
              actionLabel: 'Разместить',
              actionData: { seasonCode: topDemand.code }
            });
          }
        }
      }
      
      const currentSeasons = this.getCurrentSeasons();
      if (currentSeasons.some(s => s.isWeekendBoost)) {
        hints.push({
          type: 'weekend_boost',
          emoji: '🥐',
          text: 'Выходные — отличное время для свежей выпечки!',
          actionLabel: 'Найти',
          actionData: { seasonCode: 'bakery' }
        });
      }
      
      return {
        success: true,
        data: { hints }
      };
    } catch (error) {
      console.error('[SeasonalInsightService] generateSeasonalHints error:', error);
      return { success: false, error: error.message, data: { hints: [] } };
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export default new SeasonalInsightService();
