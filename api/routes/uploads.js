import express from 'express';
import { ObjectStorageService } from '../services/objectStorage.js';
import { telegramAuthMiddleware } from '../../middleware/telegramAuth.js';

const router = express.Router();

router.post('/presigned-url', telegramAuthMiddleware, async (req, res) => {
  try {
    const { fileExtension = 'jpg' } = req.body;
    
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getUploadURL(fileExtension);
    
    res.json({ uploadURL });
  } catch (error) {
    console.error('Error getting upload URL:', error);
    res.status(500).json({ error: 'Ошибка получения URL для загрузки' });
  }
});

export default router;
