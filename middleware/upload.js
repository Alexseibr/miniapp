const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cloudinaryModule = require('cloudinary');

const useCloudinary = String(process.env.USE_CLOUDINARY).toLowerCase() === 'true';
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
const fileSizeLimit = 10 * 1024 * 1024; // 10 MB

function ensureUploadsDir() {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'ads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
}

function fileFilter(_req, file, cb) {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Недопустимый тип файла. Разрешены JPG, PNG или WEBP'));
  }
  cb(null, true);
}

const limits = { fileSize: fileSizeLimit };

let uploadSingle;
let uploadMultiple;

if (useCloudinary) {
  const cloudinary = cloudinaryModule.v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const upload = multer({ storage: multer.memoryStorage(), fileFilter, limits });

  const uploadBuffer = (file) =>
    new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'kufor_ads' },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          return resolve(result);
        }
      );
      stream.end(file.buffer);
    });

  uploadSingle = (req, res, next) => {
    upload.single('image')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'Ошибка загрузки файла' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Файл не получен' });
      }

      try {
        const result = await uploadBuffer(req.file);
        req.uploadedUrls = [result.secure_url];
        return next();
      } catch (error) {
        console.error('Cloudinary upload error:', error);
        return res.status(500).json({ message: 'Ошибка загрузки файла' });
      }
    });
  };

  uploadMultiple = (req, res, next) => {
    upload.array('images', 10)(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'Ошибка загрузки файлов' });
      }

      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ message: 'Файлы не получены' });
      }

      try {
        const results = await Promise.all(files.map((file) => uploadBuffer(file)));
        req.uploadedUrls = results.map((item) => item.secure_url);
        return next();
      } catch (error) {
        console.error('Cloudinary upload error:', error);
        return res.status(500).json({ message: 'Ошибка загрузки файлов' });
      }
    });
  };
} else {
  const uploadsDir = ensureUploadsDir();

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const safeName = `${Date.now()}-${file.originalname}`.replace(/\s+/g, '_');
      cb(null, safeName);
    },
  });

  const upload = multer({ storage, fileFilter, limits });

  uploadSingle = (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'Ошибка загрузки файла' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Файл не получен' });
      }

      req.uploadedUrls = [`/uploads/ads/${req.file.filename}`];
      return next();
    });
  };

  uploadMultiple = (req, res, next) => {
    upload.array('images', 10)(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'Ошибка загрузки файлов' });
      }

      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ message: 'Файлы не получены' });
      }

      req.uploadedUrls = files.map((file) => `/uploads/ads/${file.filename}`);
      return next();
    });
  };
}

module.exports = {
  uploadSingle,
  uploadMultiple,
  useCloudinary,
};
