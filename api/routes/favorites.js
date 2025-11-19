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

async function adjustAdFavorites(adId, telegramId, increment) {
  const update = {
    $addToSet: {},
    $pull: {},
    $inc: {},
  };

  if (increment) {
    update.$addToSet.watchers = telegramId;
    update.$inc.favoritesCount = 1;
  } else {
    update.$pull.watchers = telegramId;
    update.$inc.favoritesCount = -1;
  }

  if (!update.$addToSet.watchers) {
    delete update.$addToSet;
  }

  if (!update.$pull.watchers) {
    delete update.$pull;
  }

  if (Object.keys(update.$inc).length === 0) {
    delete update.$inc;
  }

  if (Object.keys(update).length === 0) {
    return;
  }

  await Ad.updateOne({ _id: adId }, update).exec();

  if (!increment) {
    await Ad.updateOne(
      { _id: adId, favoritesCount: { $lt: 0 } },
      { $set: { favoritesCount: 0 } }
    ).exec();
  }
}

async function ensureAd(adId) {
  const ad = await Ad.findById(adId);
  if (!ad) {
    const error = new Error('Ad not found');
    error.status = 404;
    throw error;
  }
  return ad;
}

router.post('/add', async (req, res) => {
  try {
    const telegramId = parseTelegramId(req.body?.telegramId);
    const adId = normalizeAdId(req.body?.adId);

    if (!telegramId || !adId) {
      return res.status(400).json({ error: 'telegramId and adId are required' });
    }

    const ad = await ensureAd(adId);
    const user = await getOrCreateUser(telegramId);

    const favorites = user.favorites || [];
    const existing = favorites.find((fav) => {
      const currentId = fav.adId && fav.adId._id ? fav.adId._id : fav.adId;
      return currentId && currentId.toString() === adId.toString();
    });

    let shouldIncrementAd = false;

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
      shouldIncrementAd = true;
    }

    user.favorites = favorites;
    await user.save();

    if (shouldIncrementAd) {
      await adjustAdFavorites(adId, telegramId, true);
    }

    await user.populate('favorites.adId');
    const items = serializeFavorites(user.favorites);

    res.json({ ok: true, items });
  } catch (error) {
    console.error('POST /api/favorites/add error:', error);
    res.status(error.status || 500).json({ error: error.message || 'Server error' });
  }
});

router.get('/my', async (req, res) => {
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
    console.error('GET /api/favorites/my error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/toggle', async (req, res) => {
  try {
    const telegramId = parseTelegramId(req.body?.telegramId);
    const adId = normalizeAdId(req.body?.adId);

    if (!telegramId || !adId) {
      return res.status(400).json({ error: 'telegramId and adId are required' });
    }

    const ad = await ensureAd(adId);
    const user = await getOrCreateUser(telegramId);
    const favorites = user.favorites || [];
    const index = favorites.findIndex((fav) => {
      const currentId = fav.adId && fav.adId._id ? fav.adId._id : fav.adId;
      return currentId && currentId.toString() === adId.toString();
    });

    let isFavorite = false;

    if (index >= 0) {
      favorites.splice(index, 1);
      await adjustAdFavorites(adId, telegramId, false);
      isFavorite = false;
    } else {
      favorites.push({
        adId,
        createdAt: new Date(),
        lastKnownPrice: ad.price,
        lastKnownStatus: ad.status,
      });
      await adjustAdFavorites(adId, telegramId, true);
      isFavorite = true;
    }

    user.favorites = favorites;
    await user.save();

    res.json({ ok: true, isFavorite });
  } catch (error) {
    console.error('POST /api/favorites/toggle error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/check', async (req, res) => {
  try {
    const telegramId =
      parseTelegramId(req.query.telegramId) || parseTelegramId(req.query.userTelegramId);
    const adId = normalizeAdId(req.query.adId);

    if (!telegramId || !adId) {
      return res.status(400).json({ error: 'telegramId and adId are required' });
    }

    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.json({ isFavorite: false });
    }

    const exists = (user.favorites || []).some((fav) => {
      const currentId = fav.adId && fav.adId._id ? fav.adId._id : fav.adId;
      return currentId && currentId.toString() === adId.toString();
    });

    res.json({ isFavorite: exists });
  } catch (error) {
    console.error('GET /api/favorites/check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/remove', async (req, res) => {
  try {
    const telegramId = parseTelegramId(req.body?.telegramId);
    const adId = normalizeAdId(req.body?.adId);

    if (!telegramId || !adId) {
      return res.status(400).json({ error: 'telegramId and adId are required' });
    }

    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.json({ ok: true, items: [] });
    }

    const previousLength = user.favorites.length;
    user.favorites = (user.favorites || []).filter((fav) => {
      const currentId = fav.adId && fav.adId._id ? fav.adId._id : fav.adId;
      return !currentId || currentId.toString() !== adId.toString();
    });

    if (user.favorites.length !== previousLength) {
      await user.save();
      await adjustAdFavorites(adId, telegramId, false);
    }

    await user.populate('favorites.adId');
    res.json({ ok: true, items: serializeFavorites(user.favorites) });
  } catch (error) {
    console.error('POST /api/favorites/remove error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:telegramId', async (req, res) => {
  try {
    const telegramId = parseTelegramId(req.params.telegramId);

    if (!telegramId) {
      return res.status(400).json({ error: 'Invalid telegramId' });
    }

    const user = await User.findOne({ telegramId }).populate('favorites.adId');
    if (!user) {
      return res.json({ items: [], count: 0 });
    }

    const items = serializeFavorites(user.favorites);
    res.json({ items, count: items.length });
  } catch (error) {
    console.error('GET /api/favorites/:telegramId error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

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

    const ad = await ensureAd(adId);
    const user = await getOrCreateUser(telegramId);

    const favorites = user.favorites || [];
    const existing = favorites.find((fav) => {
      const currentId = fav.adId && fav.adId._id ? fav.adId._id : fav.adId;
      return currentId && currentId.toString() === adId.toString();
    });

    let shouldIncrementAd = false;

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
      shouldIncrementAd = true;
    }

    user.favorites = favorites;
    await user.save();

    if (shouldIncrementAd) {
      await adjustAdFavorites(adId, telegramId, true);
    }

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

    let removed = 0;
    if (beforeLength !== user.favorites.length) {
      removed = beforeLength - user.favorites.length;
      await user.save();
      await adjustAdFavorites(adId, telegramId, false);
      await user.populate('favorites.adId');
    }

    return res.json({
      ok: true,
      removed,
      items: serializeFavorites(user.favorites),
    });
  } catch (error) {
    console.error('DELETE /api/favorites/:adId error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
