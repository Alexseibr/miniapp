const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage });
const router = Router();

router.post('/', (req, res) => {
  const handler = upload.any();

  handler(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ message: 'Ошибка загрузки файла' });
    }

    const files = req.files || [];

    if (!files.length) {
      return res.status(400).json({ message: 'Файл не получен' });
    }

    const urls = files.map((file) => `/uploads/${file.filename}`);
    return res.status(201).json({ urls });
  });
});

module.exports = router;
