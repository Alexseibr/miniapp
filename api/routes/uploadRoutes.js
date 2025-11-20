const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const cloudinaryModule = require('cloudinary');
const { auth } = require('../../middleware/auth');
const { uploadSingle, uploadMultiple, useCloudinary } = require('../../middleware/upload');

const router = Router();

function extractPublicIdFromUrl(url) {
  const withoutParams = url.split('?')[0];
  const uploadIndex = withoutParams.lastIndexOf('/upload/');
  if (uploadIndex === -1) {
    const filename = withoutParams.split('/').pop();
    return filename ? filename.replace(path.extname(filename), '') : null;
  }

  const pathWithVersion = withoutParams.slice(uploadIndex + '/upload/'.length);
  const cleaned = pathWithVersion.replace(/^v\d+\//, '');
  const filename = cleaned.replace(path.extname(cleaned), '');
  return filename || null;
}

router.post('/ad-image', auth, uploadSingle, (req, res) => {
  const url = req.uploadedUrls?.[0];
  if (!url) {
    return res.status(400).json({ message: 'Файл не получен' });
  }

  return res.status(201).json({ url });
});

router.post('/ad-images', auth, uploadMultiple, (req, res) => {
  const urls = req.uploadedUrls || [];
  if (!urls.length) {
    return res.status(400).json({ message: 'Файлы не получены' });
  }

  return res.status(201).json({ urls });
});

router.delete('/remove', auth, async (req, res) => {
  try {
    const url = req.body?.url;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ message: 'url обязателен' });
    }

    if (useCloudinary) {
      const publicId = extractPublicIdFromUrl(url);
      if (!publicId) {
        return res.status(400).json({ message: 'Не удалось определить файл' });
      }

      const cloudinary = cloudinaryModule.v2;
      await cloudinary.uploader.destroy(publicId, { invalidate: true });
    } else {
      const uploadsRoot = path.join(process.cwd(), 'uploads');
      const normalizedPath = path.join(process.cwd(), url.replace(/^\/+/, ''));

      if (!normalizedPath.startsWith(uploadsRoot)) {
        return res.status(400).json({ message: 'Некорректный путь файла' });
      }

      if (fs.existsSync(normalizedPath)) {
        fs.unlinkSync(normalizedPath);
      }
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('Ошибка удаления файла:', error);
    return res.status(500).json({ message: 'Не удалось удалить файл' });
  }
});

module.exports = router;
