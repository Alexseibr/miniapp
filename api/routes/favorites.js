const express = require('express');
const User = require('../../models/User');
const Ad = require('../../models/Ad');

const router = express.Router();

const parseTelegramId = (value) => {
  if (value === undefined) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
};

async function findUserByTelegramId(req, res) {
  const telegramId = parseTelegramId(req.query.telegramId);

  if (telegramId === null) {
    res.status(400).json({ error: 'telegramId обязателен в query-параметре' });
    return null;
  }

  const user = await User.findOne({ telegramId });

  if (!user) {
    res.status(404).json({ error: 'Пользователь не найден' });
    return null;
  }

  return user;
}

async function buildFavoritesResponse(user) {
  if (!user.favorites || user.favorites.length === 0) {
    return [];
  }

  const adIds = user.favorites.map((fav) => fav.adId);
  const ads = await Ad.find({ _id: { $in: adIds } });
  const adsMap = new Map(ads.map((ad) => [ad._id.toString(), ad]));

  return user.favorites.map((fav) => ({
    adId: fav.adId,
    addedAt: fav.addedAt,
    lastKnownPrice: fav.lastKnownPrice,
    lastKnownStatus: fav.lastKnownStatus,
    ad: adsMap.get(fav.adId.toString()) || null,
  }));
}

router.get('/', async (req, res) => {
  try {
    const user = await findUserByTelegramId(req, res);
    if (!user) return;

    const items = await buildFavoritesResponse(user);
    res.json({ items });
  } catch (error) {
    console.error('GET /api/favorites error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:adId', async (req, res) => {
  try {
    const user = await findUserByTelegramId(req, res);
    if (!user) return;

    const { adId } = req.params;
    const ad = await Ad.findById(adId);

    if (!ad) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }

    const exists = (user.favorites || []).some(
      (fav) => fav.adId.toString() === ad._id.toString()
    );

    if (exists) {
      const items = await buildFavoritesResponse(user);
      return res.json({ items, message: 'Уже в избранном' });
    }

    user.favorites.push({
      adId: ad._id,
      addedAt: new Date(),
      lastKnownPrice: ad.price,
      lastKnownStatus: ad.status,
    });

    await user.save();

    if (Array.isArray(ad.watchers) && !ad.watchers.includes(user.telegramId)) {
      ad.watchers.push(user.telegramId);
      await ad.save();
    }

    const items = await buildFavoritesResponse(user);
    res.status(201).json({ items });
  } catch (error) {
    console.error('POST /api/favorites error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:adId', async (req, res) => {
  try {
    const user = await findUserByTelegramId(req, res);
    if (!user) return;

    const { adId } = req.params;
    const nextFavorites = (user.favorites || []).filter(
      (fav) => fav.adId.toString() !== adId
    );

    user.favorites = nextFavorites;
    await user.save();

    const ad = await Ad.findById(adId);
    if (ad && Array.isArray(ad.watchers)) {
      ad.watchers = ad.watchers.filter((id) => id !== user.telegramId);
      await ad.save();
    }

    const items = await buildFavoritesResponse(user);
    res.json({ items });
  } catch (error) {
    console.error('DELETE /api/favorites error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
