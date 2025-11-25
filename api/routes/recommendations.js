import express from 'express';
import aiGateway from '../../services/ai/AiGateway.js';

const router = express.Router();

router.get('/feed', async (req, res) => {
  try {
    const { 
      telegramId,
      lat, 
      lng, 
      radiusKm = 10, 
      limit = 20 
    } = req.query;
    
    const result = await aiGateway.getPersonalFeed({
      telegramId: telegramId ? Number(telegramId) : undefined,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radiusKm: parseFloat(radiusKm),
      limit: parseInt(limit)
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[Recommendations] feed error:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка получения персональной ленты'
    });
  }
});

router.get('/trending-nearby', async (req, res) => {
  try {
    const { 
      lat, 
      lng, 
      radiusKm = 5, 
      limit = 10 
    } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Необходимо указать lat и lng'
      });
    }
    
    const result = await aiGateway.getTrendingNearby({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radiusKm: parseFloat(radiusKm),
      limit: parseInt(limit)
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[Recommendations] trending-nearby error:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка получения трендов'
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
