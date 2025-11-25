import express from 'express';
import { ObjectStorageService } from '../services/objectStorage.js';
import { telegramAuthMiddleware } from '../../middleware/telegramAuth.js';

const router = express.Router();

router.post('/presigned-url', telegramAuthMiddleware, async (req, res) => {
  const requestId = Date.now().toString(36);
  console.log(`[uploads][${requestId}] POST /presigned-url - start`);
  
  try {
    const { fileExtension = 'jpg' } = req.body;
    console.log(`[uploads][${requestId}] File extension: ${fileExtension}`);
    
    const objectStorageService = new ObjectStorageService();
    const { uploadURL, publicURL } = await objectStorageService.getUploadURL(fileExtension);
    
    console.log(`[uploads][${requestId}] Success - publicURL: ${publicURL?.substring(0, 50)}...`);
    res.json({ uploadURL, publicURL });
  } catch (error) {
    console.error(`[uploads][${requestId}] Error:`, error.message || error);
    console.error(`[uploads][${requestId}] Stack:`, error.stack);
    
    const isDev = process.env.NODE_ENV === 'development';
    res.status(500).json({ 
      error: 'Ошибка получения URL для загрузки',
      code: 'UPLOAD_URL_FAILED',
      details: isDev ? String(error) : undefined,
    });
  }
});

export default router;
