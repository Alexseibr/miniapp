const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Ad = require('../../models/Ad');
const Favorite = require('../../models/Favorite');

function parseTelegramId(value) {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
}

function formatFavorite(favorite) {
  return {
    ad: favorite.adId || null,
    lastKnownPrice: favorite.lastKnownPrice ?? null,
    lastKnownStatus: favorite.lastKnownStatus ?? null,
    createdAt: favorite.createdAt,
    updatedAt: favorite.updatedAt,
  };
}

// GET /api/favorites?userTelegramId=123
router.get('/', async (req, res) => {
  try {
    const userTelegramId = parseTelegramId(req.query.userTelegramId);

    if (!userTelegramId) {
      return res.status(400).json({ error: 'userTelegramId query parameter is required' });
    }

    const favorites = await Favorite.find({ userTelegramId })
      .sort({ createdAt: -1 })
      .populate('adId');

    return res.json({ items: favorites.map(formatFavorite) });
  } catch (error) {
    console.error('GET /api/favorites error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/favorites
router.post('/', async (req, res) => {
  try {
    const { userTelegramId: telegramRaw, adId } = req.body || {};
    const userTelegramId = parseTelegramId(telegramRaw);

    if (!userTelegramId || !adId || !mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({ error: 'userTelegramId and valid adId are required' });
    }

    const adObjectId = new mongoose.Types.ObjectId(adId);

    const ad = await Ad.findById(adObjectId);
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    let favorite = await Favorite.findOne({ userTelegramId, adId: adObjectId });
    let created = false;

    if (!favorite) {
      favorite = await Favorite.create({
        userTelegramId,
        adId: adObjectId,
        lastKnownPrice: ad.price,
        lastKnownStatus: ad.status,
      });
      created = true;
    }

    await favorite.populate('adId');

    return res.status(created ? 201 : 200).json({
      item: formatFavorite(favorite),
      created,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({ message: 'Already in favorites' });
    }
    console.error('POST /api/favorites error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/favorites/:adId?userTelegramId=123
router.delete('/:adId', async (req, res) => {
  try {
    const userTelegramId = parseTelegramId(req.query.userTelegramId);
    const { adId } = req.params;

    if (!userTelegramId || !adId || !mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({ error: 'userTelegramId and valid adId are required' });
    }

    const adObjectId = new mongoose.Types.ObjectId(adId);

    const result = await Favorite.deleteOne({ userTelegramId, adId: adObjectId });

    return res.json({ deletedCount: result.deletedCount || 0 });
  } catch (error) {
    console.error('DELETE /api/favorites/:adId error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
