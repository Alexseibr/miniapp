import Ad from '../models/Ad.js';

export async function listAds(req, res) {
  const { limit = 20, tag, search } = req.query;
  const filters = {};

  if (tag) {
    filters.tags = tag;
  }

  if (search) {
    filters.title = { $regex: search, $options: 'i' };
  }

  const ads = await Ad.find(filters)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 20, 100));

  res.json(ads);
}

export async function getAd(req, res) {
  const ad = await Ad.findById(req.params.id);
  if (!ad) {
    return res.status(404).json({ message: 'Объявление не найдено' });
  }
  res.json(ad);
}

export async function createAd(req, res) {
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
