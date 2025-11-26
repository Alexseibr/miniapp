import Ad from '../models/Ad.js';
import User from '../models/User.js';
import SellerTwin from '../models/SellerTwin.js';
import GeoEvent from '../models/GeoEvent.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import * as PriceAnalyticsService from './PriceAnalyticsService.js';
import HotspotEngine from './geo/HotspotEngine.js';
import SeasonalInsightService from './geo/SeasonalInsightService.js';
import DynamicPriceEngine from './DynamicPriceEngine.js';

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map();

const QUALITY_WEIGHTS = {
  photos: 0.35,
  description: 0.25,
  title: 0.15,
  category: 0.10,
  price: 0.15,
};

const FARMER_CATEGORIES = [
  'farmer', 'farmer-vegetables', 'farmer-fruits', 'farmer-berries',
  'farmer-dairy', 'farmer-meat', 'farmer-eggs', 'farmer-honey',
  'farmer-bakery', 'farmer-flowers', 'farmer-mushrooms', 'farmer-herbs',
];

class SellerTwinEngine {
  constructor() {
    this.hotspotEngine = HotspotEngine;
    this.seasonalService = SeasonalInsightService;
    this.priceEngine = DynamicPriceEngine;
  }

  getCacheKey(prefix, params) {
    return `seller_twin:${prefix}:${JSON.stringify(params)}`;
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

  clearCache() {
    cache.clear();
  }

  async getOrCreateTwin(sellerTelegramId, sellerId = null) {
    let twin = await SellerTwin.findOne({ sellerTelegramId });
    if (!twin) {
      let actualSellerId = sellerId;
      if (!actualSellerId) {
        const user = await User.findOne({ telegramId: sellerTelegramId }).select('_id').lean();
        actualSellerId = user?._id || new (await import('mongoose')).default.Types.ObjectId();
      }
      twin = new SellerTwin({
        sellerId: actualSellerId,
        sellerTelegramId,
      });
      await twin.save();
    }
    return twin;
  }

  async trackSellerEvent(event) {
    const { sellerTelegramId, adId, eventType, data = {} } = event;
    if (!sellerTelegramId || !adId) return;

    try {
      const twin = await this.getOrCreateTwin(sellerTelegramId);

      let inventoryItem = twin.inventory.find(i => i.adId?.toString() === adId.toString());
      if (!inventoryItem) {
        const ad = await Ad.findById(adId).select('title price photos status').lean();
        if (!ad) return;
        
        twin.inventory.push({
          adId,
          createdAt: new Date(),
          views: 0,
          contacts: 0,
          favorites: 0,
          messages: 0,
          priceHistory: [{ price: ad.price, date: new Date() }],
          status: ad.status === 'active' ? 'active' : 'inactive',
        });
        inventoryItem = twin.inventory[twin.inventory.length - 1];
      }

      switch (eventType) {
        case 'view':
          inventoryItem.views += 1;
          break;
        case 'contact':
          inventoryItem.contacts += 1;
          break;
        case 'favorite':
          inventoryItem.favorites += 1;
          break;
        case 'message':
          inventoryItem.messages += 1;
          break;
        case 'price_change':
          if (data.newPrice) {
            inventoryItem.priceHistory.push({ price: data.newPrice, date: new Date() });
          }
          break;
        case 'status_change':
          if (data.status) {
            inventoryItem.status = data.status;
          }
          break;
      }
      
      inventoryItem.lastActivityAt = new Date();
      twin.stats.lastActiveAt = new Date();

      await twin.save();
      return twin;
    } catch (error) {
      console.error('[SellerTwinEngine] trackSellerEvent error:', error);
    }
  }

  async analyzeListingQuality(ad) {
    if (!ad) return { score: 0, issues: [] };

    const issues = [];
    let totalScore = 0;

    const photoScore = this.analyzePhotos(ad);
    totalScore += photoScore.score * QUALITY_WEIGHTS.photos;
    issues.push(...photoScore.issues);

    const descScore = this.analyzeDescription(ad);
    totalScore += descScore.score * QUALITY_WEIGHTS.description;
    issues.push(...descScore.issues);

    const titleScore = this.analyzeTitle(ad);
    totalScore += titleScore.score * QUALITY_WEIGHTS.title;
    issues.push(...titleScore.issues);

    const categoryScore = await this.analyzeCategory(ad);
    totalScore += categoryScore.score * QUALITY_WEIGHTS.category;
    issues.push(...categoryScore.issues);

    const priceScore = await this.analyzePricePosition(ad);
    totalScore += priceScore.score * QUALITY_WEIGHTS.price;
    issues.push(...priceScore.issues);

    return {
      score: Math.round(totalScore * 100) / 100,
      issues,
      breakdown: {
        photos: photoScore.score,
        description: descScore.score,
        title: titleScore.score,
        category: categoryScore.score,
        price: priceScore.score,
      },
    };
  }

  analyzePhotos(ad) {
    const issues = [];
    const photoCount = ad.photos?.length || 0;

    if (photoCount === 0) {
      issues.push({
        type: 'no_photos',
        severity: 1.0,
        message: 'Объявление без фото — добавьте 2-3 качественных снимка',
        actionRequired: 'Добавьте фотографии товара',
      });
      return { score: 0, issues };
    }

    if (photoCount === 1) {
      issues.push({
        type: 'bad_photos',
        severity: 0.6,
        message: 'Только 1 фото — добавьте ещё 2-3 для лучшего результата',
        actionRequired: 'Добавьте больше фотографий',
      });
      return { score: 0.4, issues };
    }

    if (photoCount === 2) {
      issues.push({
        type: 'bad_photos',
        severity: 0.3,
        message: 'Рекомендуем добавить ещё 1-2 фото с разных ракурсов',
      });
      return { score: 0.7, issues };
    }

    return { score: Math.min(1, photoCount / 4), issues };
  }

  analyzeDescription(ad) {
    const issues = [];
    const desc = ad.description || '';
    const length = desc.length;

    if (length === 0) {
      issues.push({
        type: 'no_description',
        severity: 0.9,
        message: 'Описание отсутствует — покупатели не доверяют таким объявлениям',
        actionRequired: 'Добавьте подробное описание товара',
      });
      return { score: 0, issues };
    }

    if (length < 50) {
      issues.push({
        type: 'short_description',
        severity: 0.6,
        message: 'Описание слишком короткое — добавьте подробности',
        actionRequired: 'Расширьте описание (минимум 100 символов)',
      });
      return { score: 0.3, issues };
    }

    if (length < 100) {
      issues.push({
        type: 'short_description',
        severity: 0.3,
        message: 'Рекомендуем добавить больше деталей в описание',
      });
      return { score: 0.6, issues };
    }

    const hasKeywords = /доставка|самовывоз|свежий|новый|качеств|гарантия|торг/i.test(desc);
    if (!hasKeywords && length < 200) {
      issues.push({
        type: 'missing_keywords',
        severity: 0.2,
        message: 'Добавьте ключевые слова: доставка, самовывоз, торг и др.',
      });
      return { score: 0.7, issues };
    }

    return { score: Math.min(1, length / 300), issues };
  }

  analyzeTitle(ad) {
    const issues = [];
    const title = ad.title || '';
    const length = title.length;

    if (length < 10) {
      issues.push({
        type: 'short_description',
        severity: 0.5,
        message: 'Заголовок слишком короткий — добавьте описательные слова',
      });
      return { score: 0.3, issues };
    }

    if (length > 80) {
      return { score: 0.8, issues };
    }

    const hasUppercase = /[A-ZА-Я]{5,}/.test(title);
    if (hasUppercase) {
      issues.push({
        type: 'quality_improvement',
        severity: 0.2,
        message: 'Избегайте ЗАГЛАВНЫХ букв в заголовке',
      });
      return { score: 0.7, issues };
    }

    return { score: Math.min(1, length / 50), issues };
  }

  async analyzeCategory(ad) {
    const issues = [];

    if (!ad.categoryId) {
      issues.push({
        type: 'wrong_category',
        severity: 0.7,
        message: 'Категория не выбрана — товар сложнее найти',
        actionRequired: 'Выберите подходящую категорию',
      });
      return { score: 0.3, issues };
    }

    return { score: 1.0, issues };
  }

  async analyzePricePosition(ad) {
    const issues = [];

    if (!ad.price || ad.price <= 0) {
      issues.push({
        type: 'low_price',
        severity: 0.5,
        message: 'Цена не указана или некорректна',
      });
      return { score: 0.5, issues };
    }

    try {
      const priceData = await this.priceEngine.calculatePrice(ad);
      
      if (priceData.hasMarketData && priceData.diffPercent) {
        const diffPercent = priceData.diffPercent;
        
        if (diffPercent > 30) {
          issues.push({
            type: 'high_price',
            severity: 0.8,
            message: `Цена на ${Math.round(diffPercent)}% выше рынка — покупатели могут пройти мимо`,
            actionRequired: `Рекомендуемая цена: ${priceData.recommended} руб`,
          });
          return { score: 0.3, issues };
        }
        
        if (diffPercent > 15) {
          issues.push({
            type: 'high_price',
            severity: 0.5,
            message: `Цена на ${Math.round(diffPercent)}% выше среднерыночной`,
          });
          return { score: 0.6, issues };
        }
        
        if (diffPercent < -30) {
          issues.push({
            type: 'low_price',
            severity: 0.5,
            message: `Цена на ${Math.round(Math.abs(diffPercent))}% ниже рынка — возможно, вы теряете прибыль`,
          });
          return { score: 0.7, issues };
        }
      }

      return { score: 1.0, issues };
    } catch (error) {
      return { score: 0.7, issues };
    }
  }

  async getRecommendations(sellerTelegramId, options = {}) {
    const { limit = 10, includeRead = false } = options;

    try {
      const twin = await this.getOrCreateTwin(sellerTelegramId);
      
      await this.generateRecommendations(twin);

      let recommendations = includeRead 
        ? twin.recommendations 
        : twin.recommendations.filter(r => !r.isRead);

      recommendations = recommendations
        .sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          }
          return new Date(b.createdAt) - new Date(a.createdAt);
        })
        .slice(0, limit);

      return recommendations;
    } catch (error) {
      console.error('[SellerTwinEngine] getRecommendations error:', error);
      return [];
    }
  }

  async generateRecommendations(twin) {
    const newRecommendations = [];
    const now = new Date();

    const ads = await Ad.find({
      sellerTelegramId: twin.sellerTelegramId,
      status: { $in: ['active', 'published'] },
    }).lean();

    for (const ad of ads) {
      const quality = await this.analyzeListingQuality(ad);
      
      for (const issue of quality.issues) {
        if (issue.severity >= 0.5) {
          const exists = twin.recommendations.find(r => 
            r.adId?.toString() === ad._id.toString() && 
            r.type === this.issueToRecommendationType(issue.type)
          );
          
          if (!exists) {
            newRecommendations.push({
              type: this.issueToRecommendationType(issue.type),
              text: issue.message,
              priority: issue.severity > 0.7 ? 'high' : issue.severity > 0.4 ? 'medium' : 'low',
              adId: ad._id,
              adTitle: ad.title,
              metadata: { actionRequired: issue.actionRequired },
              createdAt: now,
              expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            });
          }
        }
      }

      const priceData = await this.priceEngine.calculatePrice(ad);
      if (priceData.hasMarketData && priceData.recommended && priceData.recommended !== ad.price) {
        const diff = priceData.recommended - ad.price;
        const diffPercent = (diff / ad.price * 100).toFixed(0);
        
        const exists = twin.recommendations.find(r => 
          r.adId?.toString() === ad._id.toString() && 
          r.type === 'adjust_price'
        );
        
        if (!exists && Math.abs(diff) > ad.price * 0.1) {
          newRecommendations.push({
            type: 'adjust_price',
            text: diff > 0 
              ? `Можете поднять цену на ${diffPercent}% — рынок позволяет`
              : `Рекомендуем снизить цену на ${Math.abs(diffPercent)}% для ускорения продажи`,
            priority: Math.abs(diff) > ad.price * 0.2 ? 'high' : 'medium',
            adId: ad._id,
            adTitle: ad.title,
            metadata: { 
              currentPrice: ad.price,
              recommendedPrice: priceData.recommended,
              diffPercent: Number(diffPercent),
            },
            createdAt: now,
            expiresAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          });
        }
      }
    }

    const timingRec = this.generateTimingRecommendation(twin, ads);
    if (timingRec) newRecommendations.push(timingRec);

    if (ads.some(ad => FARMER_CATEGORIES.includes(ad.categoryId))) {
      const seasonalRec = await this.generateSeasonalRecommendation(twin);
      if (seasonalRec) newRecommendations.push(seasonalRec);
    }

    twin.recommendations.push(...newRecommendations);
    
    twin.recommendations = twin.recommendations.filter(r => 
      !r.expiresAt || new Date(r.expiresAt) > now
    );

    await twin.save();
  }

  issueToRecommendationType(issueType) {
    const mapping = {
      'no_photos': 'add_photos',
      'bad_photos': 'add_photos',
      'no_description': 'improve_description',
      'short_description': 'improve_description',
      'high_price': 'adjust_price',
      'low_price': 'adjust_price',
      'wrong_category': 'change_category',
      'missing_keywords': 'add_keywords',
      'dying_listing': 'reactivate_listing',
      'inactive_listing': 'reactivate_listing',
    };
    return mapping[issueType] || 'quality_improvement';
  }

  generateTimingRecommendation(twin, ads) {
    if (!ads.length) return null;

    const categories = [...new Set(ads.map(a => a.categoryId))];
    const isFarmer = categories.some(c => FARMER_CATEGORIES.includes(c));
    const hasBakery = categories.some(c => c?.includes('bakery'));

    if (hasBakery) {
      return {
        type: 'optimal_timing',
        text: 'Лучшее время публикации выпечки — 07:00-10:00 утра',
        priority: 'medium',
        metadata: { bestHours: [7, 8, 9, 10] },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      };
    }

    if (isFarmer) {
      return {
        type: 'optimal_timing',
        text: 'Фермерские товары лучше публиковать утром (06:00-09:00) и вечером (17:00-19:00)',
        priority: 'low',
        metadata: { bestHours: [6, 7, 8, 17, 18, 19] },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      };
    }

    return null;
  }

  async generateSeasonalRecommendation(twin) {
    const currentMonth = new Date().getMonth();
    
    const seasonalPeaks = {
      'farmer-berries': { months: [5, 6, 7, 8], name: 'ягоды' },
      'farmer-vegetables': { months: [6, 7, 8, 9], name: 'овощи' },
      'farmer-fruits': { months: [7, 8, 9, 10], name: 'фрукты' },
      'farmer-flowers': { months: [2, 3, 4, 5], name: 'цветы' },
      'farmer-honey': { months: [7, 8, 9], name: 'мёд' },
      'farmer-mushrooms': { months: [8, 9, 10], name: 'грибы' },
    };

    for (const [categoryId, config] of Object.entries(seasonalPeaks)) {
      if (config.months.includes(currentMonth)) {
        const exists = twin.recommendations.find(r => 
          r.type === 'seasonal_opportunity' && 
          r.metadata?.categoryId === categoryId
        );
        
        if (!exists) {
          return {
            type: 'seasonal_opportunity',
            text: `Сейчас сезон на ${config.name}! Спрос повышен — добавьте свежие товары`,
            priority: 'high',
            metadata: { categoryId, seasonName: config.name },
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          };
        }
      }
    }

    return null;
  }

  async predictOutcome(ad) {
    if (!ad) return null;

    try {
      const quality = await this.analyzeListingQuality(ad);
      const priceData = await this.priceEngine.calculatePrice(ad);
      
      const baseViews = 50;
      const qualityMultiplier = 0.5 + quality.score;
      const priceMultiplier = priceData.position === 'below' ? 1.3 : 
                              priceData.position === 'above' ? 0.7 : 1.0;
      const photoMultiplier = ad.photos?.length >= 3 ? 1.2 : 
                              ad.photos?.length >= 1 ? 1.0 : 0.5;

      const expectedViews3d = Math.round(baseViews * qualityMultiplier * priceMultiplier * photoMultiplier * 0.5);
      const expectedViews7d = Math.round(baseViews * qualityMultiplier * priceMultiplier * photoMultiplier);
      
      const baseChance = 0.15;
      const chanceOfSale = Math.min(0.95, baseChance * qualityMultiplier * priceMultiplier * 1.5);
      
      const contactRate = quality.score > 0.7 ? 0.12 : quality.score > 0.4 ? 0.08 : 0.04;
      const expectedContacts3d = Math.round(expectedViews3d * contactRate);
      const expectedContacts7d = Math.round(expectedViews7d * contactRate);

      const factors = [];
      
      if (quality.score < 0.5) {
        factors.push({
          name: 'Качество объявления',
          impact: -0.3,
          description: 'Улучшите фото и описание для повышения конверсии',
        });
      }
      
      if (priceData.position === 'above') {
        factors.push({
          name: 'Цена выше рынка',
          impact: -0.2,
          description: 'Снижение цены может ускорить продажу',
        });
      } else if (priceData.position === 'below') {
        factors.push({
          name: 'Конкурентная цена',
          impact: 0.2,
          description: 'Хорошая цена привлекает покупателей',
        });
      }

      if (!ad.photos?.length) {
        factors.push({
          name: 'Нет фотографий',
          impact: -0.4,
          description: 'Объявления без фото получают в 5 раз меньше просмотров',
        });
      }

      return {
        adId: ad._id,
        adTitle: ad.title,
        expectedViews3d,
        expectedViews7d,
        expectedContacts3d,
        expectedContacts7d,
        chanceOfSale: Math.round(chanceOfSale * 100) / 100,
        optimalPrice: priceData.recommended,
        optimalPublishTime: this.getOptimalPublishTime(ad.categoryId),
        confidence: priceData.confidence || 0.5,
        factors,
      };
    } catch (error) {
      console.error('[SellerTwinEngine] predictOutcome error:', error);
      return null;
    }
  }

  getOptimalPublishTime(categoryId) {
    if (!categoryId) return '09:00-12:00';
    
    if (categoryId.includes('bakery')) return '07:00-10:00';
    if (categoryId.includes('farmer')) return '06:00-09:00, 17:00-19:00';
    if (categoryId.includes('electronics')) return '10:00-14:00, 19:00-22:00';
    if (categoryId.includes('auto')) return '18:00-21:00';
    
    return '09:00-12:00, 18:00-21:00';
  }

  async findMissedOpportunities(sellerTelegramId, options = {}) {
    const { radiusKm = 5, limit = 5 } = options;

    try {
      const twin = await this.getOrCreateTwin(sellerTelegramId);
      
      const sellerAds = await Ad.find({
        sellerTelegramId,
        status: { $in: ['active', 'published'] },
      }).select('categoryId location').lean();

      const sellerCategories = [...new Set(sellerAds.map(a => a.categoryId).filter(Boolean))];
      const sellerLocation = sellerAds.find(a => a.location?.lat)?.location;

      const opportunities = [];

      if (sellerLocation) {
        try {
          const hotspots = await this.hotspotEngine.getDemandHotspots({
            lat: sellerLocation.lat,
            lng: sellerLocation.lng,
            radiusKm,
            hours: 48,
          });

          if (hotspots.success && hotspots.data?.hotspots) {
            for (const hotspot of hotspots.data.hotspots.slice(0, 5)) {
              const topCats = hotspot.topCategories || [];
              const missingCats = topCats.filter(c => !sellerCategories.includes(c));
              
              for (const catId of missingCats.slice(0, 2)) {
                opportunities.push({
                  type: 'trending_category',
                  categoryId: catId,
                  categoryName: catId,
                  demandScore: hotspot.demandScore / 100,
                  competitorCount: 0,
                  message: `В вашем районе ищут "${catId}" — попробуйте добавить такой товар`,
                  radius: radiusKm,
                  createdAt: new Date(),
                });
              }
            }
          }
        } catch (error) {
          console.error('[SellerTwinEngine] hotspot error:', error);
        }
      }

      const currentMonth = new Date().getMonth();
      const seasonalOpportunities = {
        5: { category: 'farmer-berries', name: 'клубника, черешня' },
        6: { category: 'farmer-berries', name: 'малина, смородина' },
        7: { category: 'farmer-vegetables', name: 'помидоры, огурцы' },
        8: { category: 'farmer-mushrooms', name: 'грибы' },
        9: { category: 'farmer-fruits', name: 'яблоки, груши' },
      };

      const seasonal = seasonalOpportunities[currentMonth];
      if (seasonal && !sellerCategories.includes(seasonal.category)) {
        opportunities.push({
          type: 'seasonal_peak',
          categoryId: seasonal.category,
          categoryName: seasonal.name,
          demandScore: 0.8,
          message: `Сейчас сезон на ${seasonal.name} — отличное время для продажи!`,
          createdAt: new Date(),
        });
      }

      twin.missedOpportunities = opportunities.slice(0, limit);
      await twin.save();

      return opportunities.slice(0, limit);
    } catch (error) {
      console.error('[SellerTwinEngine] findMissedOpportunities error:', error);
      return [];
    }
  }

  async getOverview(sellerTelegramId) {
    try {
      const twin = await this.getOrCreateTwin(sellerTelegramId);

      const ads = await Ad.find({
        sellerTelegramId,
        status: { $in: ['active', 'published'] },
      }).lean();

      let totalQuality = 0;
      const issues = [];
      const predictions = [];

      for (const ad of ads) {
        const quality = await this.analyzeListingQuality(ad);
        totalQuality += quality.score;
        
        for (const issue of quality.issues) {
          issues.push({
            ...issue,
            adId: ad._id,
            adTitle: ad.title,
          });
        }

        const prediction = await this.predictOutcome(ad);
        if (prediction) predictions.push(prediction);
      }

      const avgQuality = ads.length > 0 ? totalQuality / ads.length : 0;

      twin.stats.totalAds = await Ad.countDocuments({ sellerTelegramId });
      twin.stats.activeAds = ads.length;
      twin.stats.avgQualityScore = avgQuality;

      twin.issues = issues.sort((a, b) => b.severity - a.severity).slice(0, 20);
      twin.predictions = predictions;
      twin.lastAnalyzedAt = new Date();

      await twin.save();

      const recommendations = await this.getRecommendations(sellerTelegramId, { limit: 5 });
      const missedOpportunities = await this.findMissedOpportunities(sellerTelegramId);

      const isFarmer = ads.some(ad => FARMER_CATEGORIES.includes(ad.categoryId));
      let seasonalInsights = [];
      if (isFarmer) {
        seasonalInsights = this.getSeasonalInsights();
      }

      return {
        stats: {
          totalAds: twin.stats.totalAds,
          activeAds: twin.stats.activeAds,
          avgQualityScore: Math.round(avgQuality * 100),
          totalViews: twin.stats.totalViews,
          totalContacts: twin.stats.totalContacts,
        },
        qualityReport: {
          score: Math.round(avgQuality * 100),
          breakdown: ads.length > 0 ? {
            photosScore: Math.round((ads.filter(a => a.photos?.length >= 3).length / ads.length) * 100),
            descriptionsScore: Math.round((ads.filter(a => (a.description?.length || 0) > 100).length / ads.length) * 100),
          } : { photosScore: 0, descriptionsScore: 0 },
        },
        issues: twin.issues.slice(0, 10),
        recommendations,
        predictions: predictions.slice(0, 5),
        seasonalInsights,
        missedOpportunities,
        isFarmer,
        lastAnalyzedAt: twin.lastAnalyzedAt,
      };
    } catch (error) {
      console.error('[SellerTwinEngine] getOverview error:', error);
      throw error;
    }
  }

  getSeasonalInsights() {
    const currentMonth = new Date().getMonth();
    const insights = [];

    const categories = [
      { id: 'farmer-berries', name: 'Ягоды', peakMonths: [5, 6, 7, 8] },
      { id: 'farmer-vegetables', name: 'Овощи', peakMonths: [6, 7, 8, 9] },
      { id: 'farmer-fruits', name: 'Фрукты', peakMonths: [7, 8, 9, 10] },
      { id: 'farmer-flowers', name: 'Цветы', peakMonths: [2, 3, 4, 5] },
      { id: 'farmer-honey', name: 'Мёд', peakMonths: [7, 8, 9] },
      { id: 'farmer-mushrooms', name: 'Грибы', peakMonths: [8, 9, 10] },
    ];

    for (const cat of categories) {
      const isInPeak = cat.peakMonths.includes(currentMonth);
      const nextPeakMonth = cat.peakMonths.find(m => m > currentMonth) || cat.peakMonths[0];
      
      const nextPeakDate = new Date();
      nextPeakDate.setMonth(nextPeakMonth);
      if (nextPeakMonth <= currentMonth) {
        nextPeakDate.setFullYear(nextPeakDate.getFullYear() + 1);
      }

      insights.push({
        categoryId: cat.id,
        categoryName: cat.name,
        currentDemandLevel: isInPeak ? 'peak' : 'medium',
        nextPeakStart: nextPeakDate,
        notes: isInPeak 
          ? `Сейчас пик сезона на ${cat.name.toLowerCase()}!` 
          : `Следующий сезон начнётся через ${Math.ceil((nextPeakDate - new Date()) / (1000 * 60 * 60 * 24 * 30))} мес.`,
        recommendedAction: isInPeak 
          ? 'Добавьте свежие товары — спрос максимальный' 
          : 'Подготовьтесь к сезону заранее',
      });
    }

    return insights;
  }

  async monitorMarketChanges(sellerTelegramId) {
    try {
      const twin = await this.getOrCreateTwin(sellerTelegramId);
      const ads = await Ad.find({
        sellerTelegramId,
        status: { $in: ['active', 'published'] },
      }).lean();

      const alerts = [];

      for (const ad of ads) {
        const priceData = await this.priceEngine.calculatePrice(ad);
        
        if (priceData.hasMarketData) {
          if (priceData.diffPercent > 20) {
            alerts.push({
              type: 'price_alert',
              message: `"${ad.title}" — цена выше рынка на ${Math.round(priceData.diffPercent)}%`,
              adId: ad._id,
              severity: 'medium',
            });
          }

          if (priceData.marketAvg && priceData.marketAvg > ad.price * 1.15) {
            alerts.push({
              type: 'opportunity',
              message: `Цены на рынке выросли — можете поднять цену на "${ad.title}"`,
              adId: ad._id,
              severity: 'low',
            });
          }
        }
      }

      return alerts;
    } catch (error) {
      console.error('[SellerTwinEngine] monitorMarketChanges error:', error);
      return [];
    }
  }
}

export default new SellerTwinEngine();
