import { Router } from 'express';
import Ad from '../../models/Ad.js';
import DynamicPriceEngine from '../../services/DynamicPriceEngine.js';
import PriceWatcher from '../../workers/PriceWatcher.js';

const router = Router();

router.get('/my-ads', async (req, res, next) => {
  try {
    const sellerId = req.headers['x-telegram-id'];

    if (!sellerId) {
      return res.status(400).json({ error: 'x-telegram-id header обязателен' });
    }

    const ads = await Ad.find({
      sellerTelegramId: Number(sellerId),
      status: { $in: ['active', 'published'] },
    })
      .select('title price photos categoryId location views favoritesCount')
      .sort({ createdAt: -1 })
      .lean();

    const recommendations = await Promise.all(
      ads.map(async (ad) => {
        try {
          const priceData = await DynamicPriceEngine.calculatePrice(ad);
          return {
            adId: ad._id.toString(),
            title: ad.title,
            currentPrice: ad.price,
            photo: ad.photos?.[0],
            ...priceData,
          };
        } catch (err) {
          return {
            adId: ad._id.toString(),
            title: ad.title,
            currentPrice: ad.price,
            photo: ad.photos?.[0],
            success: false,
            error: err.message,
          };
        }
      })
    );

    res.json({
      ads: recommendations,
      total: recommendations.length,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/seller/:sellerId/recalculate', async (req, res, next) => {
  try {
    const { sellerId } = req.params;
    const headerSellerId = req.headers['x-telegram-id'];

    if (headerSellerId && headerSellerId !== sellerId) {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const result = await DynamicPriceEngine.recalculateForSeller(Number(sellerId));
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/analytics/market', async (req, res, next) => {
  try {
    const { categoryId, lat, lng, radiusKm = 10 } = req.query;

    if (!categoryId) {
      return res.status(400).json({ error: 'categoryId обязателен' });
    }

    const analytics = await DynamicPriceEngine.getMarketAnalytics(
      categoryId,
      lat ? Number(lat) : null,
      lng ? Number(lng) : null,
      Number(radiusKm)
    );

    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

router.get('/trend/:categoryId', async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { lat, lng, days = 7 } = req.query;

    const trend = await DynamicPriceEngine.getMarketTrend(
      categoryId,
      lat ? Number(lat) : null,
      lng ? Number(lng) : null,
      Number(days)
    );

    res.json(trend);
  } catch (error) {
    next(error);
  }
});

function transformFactorsForUI(priceData) {
  const rawFactors = priceData.factors || {};
  const demandScore = rawFactors.demandScore || 1.0;
  const competitionFactor = rawFactors.competitionFactor || 1.0;
  const seasonFactor = rawFactors.seasonFactor || 1.0;
  const timeFactor = rawFactors.timeFactor || 1.0;
  const qualityFactor = rawFactors.qualityFactor || 1.0;

  const toScore = (factor, base = 1.0) => Math.min(1, Math.max(0, (factor - 0.8) / 0.4 + 0.5));

  return {
    demand: {
      score: toScore(demandScore),
      label: 'Спрос',
      description: demandScore > 1.1 ? 'Высокий спрос в регионе' : 
                   demandScore < 0.95 ? 'Низкий спрос в регионе' : 'Средний спрос',
    },
    competition: {
      score: toScore(competitionFactor),
      label: 'Конкуренты',
      description: competitionFactor > 1.0 ? 'Мало конкурентов' : 
                   competitionFactor < 1.0 ? 'Много конкурентов' : 'Средняя конкуренция',
    },
    seasonality: {
      score: toScore(seasonFactor),
      label: 'Сезонность',
      description: seasonFactor > 1.1 ? 'Сезонный пик спроса' : 
                   seasonFactor < 0.95 ? 'Несезон' : 'Нейтральный сезон',
    },
    timing: {
      score: toScore(timeFactor),
      label: 'Время',
      description: timeFactor > 1.05 ? 'Удачное время дня' : 
                   timeFactor < 0.95 ? 'Неоптимальное время' : 'Нейтральное время',
    },
    buyerActivity: {
      score: toScore(qualityFactor),
      label: 'Активность',
      description: qualityFactor > 1.05 ? 'Высокое качество объявления' : 
                   qualityFactor < 0.95 ? 'Улучшите объявление' : 'Стандартное качество',
    },
  };
}

function determineAction(currentPrice, recommendedPrice) {
  if (!recommendedPrice) return 'keep';
  const diff = recommendedPrice - currentPrice;
  const percentDiff = (diff / currentPrice) * 100;
  if (percentDiff > 5) return 'raise';
  if (percentDiff < -5) return 'lower';
  return 'keep';
}

function determineMarketPosition(position) {
  if (position === 'below') return 'below_market';
  if (position === 'above') return 'above_market';
  return 'fair_price';
}

function determineUrgency(diffPercent, demandScore) {
  const absDiff = Math.abs(diffPercent || 0);
  const demand = demandScore || 1.0;
  if (absDiff > 20 || demand > 1.2) return 'high';
  if (absDiff > 10 || demand > 1.1) return 'medium';
  return 'low';
}

router.get('/analyze/:adId', async (req, res, next) => {
  try {
    const { adId } = req.params;
    const sellerId = req.headers['x-telegram-id'] || req.query.sellerId;

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }

    if (sellerId && ad.sellerTelegramId !== Number(sellerId)) {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const priceData = await DynamicPriceEngine.calculatePrice(ad);

    const [priceHistory, marketTrend] = await Promise.all([
      DynamicPriceEngine.getPriceHistory(adId, 7),
      DynamicPriceEngine.getMarketTrend(
        ad.categoryId,
        ad.location?.lat,
        ad.location?.lng,
        7
      ),
    ]);

    const recommendedPrice = priceData.recommended || ad.price;
    const priceChange = recommendedPrice - ad.price;
    const percentChange = ad.price > 0 ? (priceChange / ad.price * 100) : 0;
    const action = determineAction(ad.price, priceData.recommended);
    const marketPosition = determineMarketPosition(priceData.position);
    const urgency = determineUrgency(priceData.diffPercent, priceData.factors?.demandScore);
    const factors = transformFactorsForUI(priceData);
    const potentialBuyers = Math.round((priceData.sampleSize || 0) * (priceData.factors?.demandScore || 1));

    const reasoning = priceData.reasons?.length > 0 
      ? priceData.reasons.join('. ') 
      : (action === 'raise' ? 'Рекомендуем повысить цену для увеличения прибыли' :
         action === 'lower' ? 'Рекомендуем снизить цену для ускорения продажи' :
         'Ваша цена оптимальна для текущего рынка');

    res.json({
      adId: ad._id.toString(),
      title: ad.title,
      currentPrice: ad.price,
      recommendedPrice,
      priceChange,
      percentChange: Math.round(percentChange * 10) / 10,
      action,
      confidence: priceData.confidence || 0.5,
      reasoning,
      factors,
      marketPosition,
      potentialBuyers,
      urgency,
      validUntil: new Date(Date.now() + 3600000).toISOString(),
      priceHistory,
      marketTrend,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/apply/:adId', async (req, res, next) => {
  try {
    const { adId } = req.params;
    const sellerId = req.headers['x-telegram-id'] || req.body.sellerId;
    const { newPrice: requestedPrice } = req.body;

    if (!sellerId) {
      return res.status(400).json({ error: 'sellerId обязателен' });
    }

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }

    if (ad.sellerTelegramId !== Number(sellerId)) {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    let newPrice;
    if (requestedPrice && typeof requestedPrice === 'number' && requestedPrice > 0) {
      newPrice = requestedPrice;
    } else {
      const priceData = await DynamicPriceEngine.calculatePrice(ad);
      
      if (!priceData.success || !priceData.hasMarketData || !priceData.recommended) {
        return res.status(400).json({ error: 'Не удалось рассчитать рекомендованную цену' });
      }
      newPrice = priceData.recommended;
    }

    const oldPrice = ad.price;

    ad.priceHistory.push({
      oldPrice,
      newPrice,
      changedAt: new Date(),
    });
    ad.price = newPrice;
    ad.lastPriceChangeAt = new Date();
    
    await ad.save();

    DynamicPriceEngine.clearCache();

    res.json({
      success: true,
      adId: ad._id.toString(),
      oldPrice,
      newPrice,
      message: `Цена изменена с ${oldPrice} на ${newPrice} Br`,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/watcher/status', async (req, res) => {
  const status = PriceWatcher.getStatus();
  res.json(status);
});

router.post('/watcher/check', async (req, res, next) => {
  try {
    const { categoryId, lat, lng } = req.body;
    
    if (!categoryId) {
      return res.status(400).json({ error: 'categoryId обязателен' });
    }

    const result = await PriceWatcher.checkMarketChanges(
      categoryId,
      lat ? Number(lat) : null,
      lng ? Number(lng) : null
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/compare/:adId', async (req, res, next) => {
  try {
    const { adId } = req.params;
    const { radiusKm = 5 } = req.query;

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }

    const matchQuery = {
      categoryId: ad.categoryId,
      status: 'active',
      moderationStatus: 'approved',
      price: { $gt: 0 },
      _id: { $ne: ad._id },
    };

    if (ad.location?.lat && ad.location?.lng) {
      matchQuery['location.coordinates'] = {
        $geoWithin: {
          $centerSphere: [[ad.location.lng, ad.location.lat], Number(radiusKm) / 6378.1]
        }
      };
    }

    const competitors = await Ad.find(matchQuery)
      .select('title price photos location createdAt')
      .sort({ price: 1 })
      .limit(10)
      .lean();

    const prices = competitors.map(c => c.price);
    const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;
    const minPrice = prices.length ? Math.min(...prices) : null;
    const maxPrice = prices.length ? Math.max(...prices) : null;

    res.json({
      adId: ad._id.toString(),
      currentPrice: ad.price,
      competitorsCount: competitors.length,
      avgPrice,
      minPrice,
      maxPrice,
      pricePosition: avgPrice ? (ad.price > avgPrice ? 'above' : ad.price < avgPrice ? 'below' : 'equal') : 'unknown',
      competitors: competitors.map(c => ({
        id: c._id.toString(),
        title: c.title,
        price: c.price,
        photo: c.photos?.[0],
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
