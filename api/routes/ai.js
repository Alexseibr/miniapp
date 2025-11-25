import express from 'express';
import aiGateway from '../../services/ai/AiGateway.js';
import aiEngine from '../../services/ai/AiEngine.js';

const router = express.Router();

router.post('/suggest-title', async (req, res) => {
  try {
    const { rawText, categoryId, subcategoryId, attributes } = req.body;
    
    if (!rawText && !categoryId) {
      return res.status(400).json({
        success: false,
        error: 'Необходимо указать rawText или categoryId'
      });
    }
    
    const result = await aiGateway.suggestTitle({
      rawText,
      categoryId,
      subcategoryId,
      attributes
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[AI] suggest-title error:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка генерации заголовка'
    });
  }
});

router.post('/suggest-description', async (req, res) => {
  try {
    const { title, categoryId, subcategoryId, bulletPoints, attributes } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Необходимо указать title'
      });
    }
    
    const result = await aiGateway.suggestDescription({
      title,
      categoryId,
      subcategoryId,
      bulletPoints,
      attributes
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[AI] suggest-description error:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка генерации описания'
    });
  }
});

router.post('/suggest-tags', async (req, res) => {
  try {
    const { title, description, categoryId } = req.body;
    
    if (!title && !description) {
      return res.status(400).json({
        success: false,
        error: 'Необходимо указать title или description'
      });
    }
    
    const result = await aiGateway.suggestTags({
      title,
      description,
      categoryId
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[AI] suggest-tags error:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка генерации тегов'
    });
  }
});

router.post('/check-moderation', async (req, res) => {
  try {
    const { title, description, categoryId, price, phone, username, photos } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Необходимо указать title'
      });
    }
    
    const result = await aiGateway.checkAdModeration({
      title,
      description,
      categoryId,
      price,
      phone,
      username,
      photos
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[AI] check-moderation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка проверки модерации'
    });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = aiGateway.getStats();
    return res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[AI] stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Ошибка получения статистики'
    });
  }
});

router.post('/description', async (req, res) => {
  try {
    const { title, categoryId, photos, price } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'title is required'
      });
    }
    
    const result = await aiEngine.generateDescription({
      title,
      categoryId,
      photos,
      price
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[AI API] description error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/category', async (req, res) => {
  try {
    const { title, description, price, photos } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'title is required'
      });
    }
    
    const result = await aiEngine.autoCategory({
      title,
      description,
      price,
      photos
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[AI API] category error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/tags', async (req, res) => {
  try {
    const { title, description, categoryId } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'title is required'
      });
    }
    
    const result = await aiEngine.generateTags({
      title,
      description,
      categoryId
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[AI API] tags error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/search', async (req, res) => {
  try {
    const { query, lat, lng, radiusKm } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'query is required'
      });
    }
    
    const result = await aiEngine.aiSearch(query, {
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radiusKm: radiusKm ? parseFloat(radiusKm) : 10
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[AI API] search error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q, lat, lng, radius } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'q (query) is required'
      });
    }
    
    const result = await aiEngine.aiSearch(q, {
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radiusKm: radius ? parseFloat(radius) : 10
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[AI API] search GET error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/intent', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'query is required'
      });
    }
    
    const result = await aiEngine.aiIntentSearch(query);
    
    return res.json(result);
  } catch (error) {
    console.error('[AI API] intent error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/seller-suggestions/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    if (!sellerId) {
      return res.status(400).json({
        success: false,
        error: 'sellerId is required'
      });
    }
    
    const result = await aiEngine.aiSuggestForSeller(sellerId);
    
    return res.json(result);
  } catch (error) {
    console.error('[AI API] seller-suggestions error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/seller-suggestions', async (req, res) => {
  try {
    const { sellerId, telegramId } = req.body;
    
    const id = sellerId || telegramId;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'sellerId or telegramId is required'
      });
    }
    
    const result = await aiEngine.aiSuggestForSeller(id);
    
    return res.json(result);
  } catch (error) {
    console.error('[AI API] seller-suggestions POST error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/moderation', async (req, res) => {
  try {
    const { title, description, price, photos, categoryId } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'title is required'
      });
    }
    
    const result = await aiEngine.autoModeration({
      title,
      description,
      price,
      photos,
      categoryId
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[AI API] moderation error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/similar/:adId', async (req, res) => {
  try {
    const { adId } = req.params;
    const { limit } = req.query;
    
    if (!adId) {
      return res.status(400).json({
        success: false,
        error: 'adId is required'
      });
    }
    
    const result = await aiEngine.getSimilarAds(adId, limit ? parseInt(limit) : 10);
    
    return res.json(result);
  } catch (error) {
    console.error('[AI API] similar error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/improve', async (req, res) => {
  try {
    const { title, description } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'title is required'
      });
    }
    
    const result = await aiEngine.improveAdText({ title, description });
    
    return res.json(result);
  } catch (error) {
    console.error('[AI API] improve error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/full-analysis', async (req, res) => {
  try {
    const { title, description, price, photos, categoryId } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'title is required'
      });
    }
    
    const ad = { title, description, price, photos, categoryId };
    
    const [descriptionResult, categoryResult, tagsResult, moderationResult, improveResult] = await Promise.all([
      aiEngine.generateDescription(ad),
      aiEngine.autoCategory(ad),
      aiEngine.generateTags(ad),
      aiEngine.autoModeration(ad),
      aiEngine.improveAdText(ad)
    ]);
    
    return res.json({
      success: true,
      data: {
        description: descriptionResult.success ? descriptionResult.data : null,
        category: categoryResult.success ? categoryResult.data : null,
        tags: tagsResult.success ? tagsResult.data : null,
        moderation: moderationResult.success ? moderationResult.data : null,
        improvements: improveResult.success ? improveResult.data : null
      }
    });
  } catch (error) {
    console.error('[AI API] full-analysis error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
