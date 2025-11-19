const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../../models/User');
const Ad = require('../../models/Ad');

function parseTelegramId(raw) {
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
}

async function getOrCreateUser(telegramId) {
  let user = await User.findOne({ telegramId });
  if (!user) {
    user = await User.create({ telegramId });
  }
  return user;
}

function normalizeAdId(value) {
  if (!value) {
    return null;
  }
  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
}

function serializeFavorites(favorites = []) {
  return favorites
    .filter((fav) => fav && fav.adId)
    .map((fav) => {
      const ad = fav.adId;
      return {
        adId: ad?._id || fav.adId,
        ad: ad && typeof ad.toObject === 'function' ? ad.toObject() : ad,
        createdAt: fav.createdAt,
        lastKnownPrice: fav.lastKnownPrice ?? null,
        lastKnownStatus: fav.lastKnownStatus ?? null,
      };
    });
}

router.get('/', async (req, res) => {
  try {
    const telegramId =
      parseTelegramId(req.query.telegramId) || parseTelegramId(req.query.userTelegramId);

    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId query parameter is required' });
    }

    const user = await User.findOne({ telegramId }).populate('favorites.adId');

    if (!user) {
      return res.json({ items: [] });
    }

    return res.json({ items: serializeFavorites(user.favorites) });
  } catch (error) {
    console.error('GET /api/favorites error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:adId', async (req, res) => {
  try {
    const telegramId = parseTelegramId(req.body?.telegramId);
    const adId = normalizeAdId(req.params.adId);

    if (!telegramId || !adId) {
      return res.status(400).json({ error: 'telegramId and valid adId are required' });
    }

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    const user = await getOrCreateUser(telegramId);

    const favorites = user.favorites || [];
    const existing = favorites.find((fav) => {
      const currentId = fav.adId && fav.adId._id ? fav.adId._id : fav.adId;
      return currentId && currentId.toString() === adId.toString();
    });

    if (existing) {
      existing.lastKnownPrice = ad.price;
      existing.lastKnownStatus = ad.status;
    } else {
      favorites.push({
        adId,
        createdAt: new Date(),
        lastKnownPrice: ad.price,
        lastKnownStatus: ad.status,
      });
    }

    user.favorites = favorites;
    await user.save();
    await user.populate('favorites.adId');

    const items = serializeFavorites(user.favorites);
    return res.status(existing ? 200 : 201).json({ ok: true, items });
  } catch (error) {
    console.error('POST /api/favorites/:adId error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:adId', async (req, res) => {
  try {
    const telegramId =
      parseTelegramId(req.body?.telegramId) || parseTelegramId(req.query.telegramId);
    const adId = normalizeAdId(req.params.adId);

    if (!telegramId || !adId) {
      return res.status(400).json({ error: 'telegramId and valid adId are required' });
    }

    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.json({ ok: true, items: [] });
    }

    const beforeLength = user.favorites.length;
    user.favorites = (user.favorites || []).filter((fav) => {
      const currentId = fav.adId && fav.adId._id ? fav.adId._id : fav.adId;
      return !currentId || currentId.toString() !== adId.toString();
    });

    if (user.isModified('favorites')) {
      await user.save();
      await user.populate('favorites.adId');
    }

    return res.json({
      ok: true,
      removed: beforeLength - user.favorites.length,
      items: serializeFavorites(user.favorites),
    });
  } catch (error) {
    console.error('DELETE /api/favorites/:adId error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
