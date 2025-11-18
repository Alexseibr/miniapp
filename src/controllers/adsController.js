import Ad from '../models/Ad.js';

const MAX_LIMIT = 100;

export async function listAds(req, res) {
  const { limit = 20, categoryId, subcategoryId, seasonCode } = req.query;
  const filters = { status: 'active' };

  if (categoryId) {
    filters.categoryId = categoryId;
  }

  if (subcategoryId) {
    filters.subcategoryId = subcategoryId;
  }

  if (seasonCode) {
    filters.seasonCode = seasonCode;
  }

  const safeLimit = Math.min(Number(limit) || 20, MAX_LIMIT);

  const ads = await Ad.find(filters)
    .sort({ createdAt: -1 })
    .limit(safeLimit);

  res.json({ items: ads });
}

export async function getAd(req, res) {
  const ad = await Ad.findById(req.params.id);
  if (!ad) {
    return res.status(404).json({ message: 'Объявление не найдено' });
  }
  res.json(ad);
}

export async function createAd(req, res) {
  const required = ['title', 'categoryId', 'subcategoryId', 'price', 'sellerTelegramId'];
  const missing = required.filter((field) => !req.body[field] && req.body[field] !== 0);

  if (missing.length) {
    return res.status(400).json({ message: `Отсутствуют обязательные поля: ${missing.join(', ')}` });
  }

  const ad = await Ad.create(req.body);
  res.status(201).json(ad);
}

export async function updateAd(req, res) {
  const ad = await Ad.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!ad) {
    return res.status(404).json({ message: 'Объявление не найдено' });
  }

  res.json(ad);
}

export async function deleteAd(req, res) {
  const ad = await Ad.findByIdAndDelete(req.params.id);
  if (!ad) {
    return res.status(404).json({ message: 'Объявление не найдено' });
  }

  res.json({ success: true });
}
