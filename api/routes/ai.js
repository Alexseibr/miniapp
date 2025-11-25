import express from 'express';
import aiGateway from '../../services/ai/AiGateway.js';

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

export default router;
