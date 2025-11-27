import express from 'express';
import { mediaService } from '../../services/MediaService.js';
import { telegramAuthMiddleware } from '../../middleware/telegramAuth.js';

const router = express.Router();

const MAX_FILE_SIZE_BYTES = parseInt(process.env.UPLOAD_MAX_SIZE_BYTES || '10485760', 10);
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

router.post('/presigned-url', telegramAuthMiddleware, async (req, res) => {
  const requestId = Date.now().toString(36);
  console.log(`[uploads][${requestId}] POST /presigned-url - start`);
  
  try {
    const { 
      fileExtension = 'jpg', 
      mimeType = 'image/jpeg',
      size 
    } = req.body;
    
    console.log(`[uploads][${requestId}] File: ext=${fileExtension}, mime=${mimeType}, size=${size}`);

    if (size && size > MAX_FILE_SIZE_BYTES) {
      console.log(`[uploads][${requestId}] Rejected: file too large (${size} > ${MAX_FILE_SIZE_BYTES})`);
      return res.status(400).json({ 
        error: 'FILE_TOO_LARGE',
        message: `Файл слишком большой. Максимальный размер — ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} МБ.`,
      });
    }

    if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      console.log(`[uploads][${requestId}] Rejected: invalid mime type ${mimeType}`);
      return res.status(400).json({ 
        error: 'INVALID_FILE_TYPE',
        message: `Недопустимый тип файла. Разрешены: JPEG, PNG, WebP.`,
      });
    }

    const ownerTelegramId = req.user?.telegramId || req.body.telegramId;

    const result = await mediaService.createUploadSession({
      mimeType,
      size,
      ownerTelegramId,
      fileExtension,
    });
    
    console.log(`[uploads][${requestId}] Success - fileId: ${result.fileId}, url: ${result.fileUrl?.substring(0, 50)}...`);
    
    res.json({
      uploadURL: result.uploadURL,
      publicURL: result.fileUrl,
      fileId: result.fileId,
      thumbUrl: result.thumbUrl,
    });
  } catch (error) {
    console.error(`[uploads][${requestId}] Error:`, error.message || error);
    console.error(`[uploads][${requestId}] Stack:`, error.stack);
    
    const isDev = process.env.NODE_ENV === 'development';
    res.status(500).json({ 
      error: 'UPLOAD_URL_FAILED',
      message: 'Ошибка получения URL для загрузки',
      details: isDev ? String(error) : undefined,
    });
  }
});

router.post('/:fileId/complete', telegramAuthMiddleware, async (req, res) => {
  const requestId = Date.now().toString(36);
  const { fileId } = req.params;
  
  console.log(`[uploads][${requestId}] POST /${fileId}/complete - start`);
  
  try {
    const ownerTelegramId = req.user?.telegramId || req.body.telegramId;
    
    const mediaFile = await mediaService.completeUpload(fileId, ownerTelegramId);
    
    console.log(`[uploads][${requestId}] Complete success - thumbUrl: ${mediaFile.thumbUrl}`);
    
    res.json({
      success: true,
      fileId: mediaFile._id.toString(),
      originalUrl: mediaFile.originalUrl,
      thumbUrl: mediaFile.thumbUrl,
      status: mediaFile.status,
    });
  } catch (error) {
    console.error(`[uploads][${requestId}] Complete error:`, error.message);
    
    if (error.message === 'MediaFile not found') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Файл не найден' });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Нет доступа к файлу' });
    }
    
    res.status(500).json({ 
      error: 'COMPLETE_FAILED',
      message: 'Ошибка завершения загрузки',
    });
  }
});

router.get('/limits', (req, res) => {
  res.json({
    maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
    maxFileSizeMB: Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024),
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
  });
});

export default router;
