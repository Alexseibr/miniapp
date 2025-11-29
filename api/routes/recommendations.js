import express from 'express';
import aiGateway from '../../services/ai/AiGateway.js';
import RecommendationEngine from '../../services/RecommendationEngine.js';

const router = express.Router();

function getTelegramId(req) {
  return req.headers['x-telegram-id'] || req.query.telegramId || req.user?.telegramId;
}

router.get('/feed', async (req, res) => {
  try {
    const telegramId = getTelegramId(req);
    const { lat, lng, radiusKm = 10, cursor = 0, limit = 20 } = req.query;

    const result = await RecommendationEngine.getForYouFeed({
      telegramId: telegramId ? Number(telegramId) : null,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      radiusKm: parseFloat(radiusKm),
      cursor: parseInt(cursor),
      limit: parseInt(limit),
    });

    return res.json(result);
  } catch (error) {
    console.error('[Recommendations] feed error:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка получения персональной ленты',
      items: [],
    });
  }
});

router.get('/similar/:adId', async (req, res) => {
  try {
    const { adId } = req.params;
    const { limit = 10 } = req.query;

    const result = await RecommendationEngine.getSimilarItems(adId, {
      limit: parseInt(limit),
    });

    return res.json(result);
  } catch (error) {
    console.error('[Recommendations] similar error:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка получения похожих товаров',
      items: [],
    });
  }
});

router.get('/trending-nearby', async (req, res) => {
  try {
    const { lat, lng, radiusKm = 5, limit = 10 } = req.query;

    const result = await RecommendationEngine.getTrendingNearby({
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      radiusKm: parseFloat(radiusKm),
      limit: parseInt(limit),
    });

    return res.json(result);
  } catch (error) {
    console.error('[Recommendations] trending-nearby error:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка получения трендов',
      items: [],
    });
  }
});

router.get('/trending', async (req, res) => {
  try {
    const { lat, lng, radiusKm = 5, limit = 10 } = req.query;

    const result = await RecommendationEngine.getTrendingNearby({
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      radiusKm: parseFloat(radiusKm),
      limit: parseInt(limit),
    });

    return res.json(result);
  } catch (error) {
    console.error('[Recommendations] trending error:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка получения трендов',
      items: [],
    });
  }
});

router.post('/track', async (req, res) => {
  try {
    const { telegramId, action, adId, categoryId, searchQuery } = req.body;
    
    if (!telegramId) {
      return res.status(400).json({
        success: false,
        error: 'telegramId is required'
      });
    }
    
    const result = await aiGateway.trackUserActivity({
      telegramId: Number(telegramId),
      action,
      adId,
      categoryId,
      searchQuery
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[Recommendations] track error:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка отслеживания активности'
    });
  }
});

export default router;
