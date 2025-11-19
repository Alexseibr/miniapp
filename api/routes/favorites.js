const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Ad = require('../../models/Ad');

function normalizeTelegramId(value) {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
}

async function ensureUserExists(telegramId) {
  return User.findOne({ telegramId });
}

router.get('/my', async (req, res) => {
  try {
    const telegramId = normalizeTelegramId(req.query.telegramId);

    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId query parameter is required' });
    }

    const user = await User.findOne({ telegramId }).populate('favorites');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ favorites: user.favorites || [] });
  } catch (error) {
    console.error('GET /api/favorites/my error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/add', async (req, res) => {
  try {
    const { telegramId: telegramIdRaw, adId } = req.body || {};
    const telegramId = normalizeTelegramId(telegramIdRaw);

    if (!telegramId || !adId) {
      return res.status(400).json({ error: 'telegramId and adId are required' });
    }

    const user = await ensureUserExists(telegramId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    const alreadyExists = (user.favorites || []).some(
      (favoriteId) => favoriteId && favoriteId.toString() === adId
    );

    if (!alreadyExists) {
      user.favorites.push(ad._id);
      await user.save();
    }

    res.json({ ok: true, favorites: user.favorites });
  } catch (error) {
    console.error('POST /api/favorites/add error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/remove', async (req, res) => {
  try {
    const { telegramId: telegramIdRaw, adId } = req.body || {};
    const telegramId = normalizeTelegramId(telegramIdRaw);

    if (!telegramId || !adId) {
      return res.status(400).json({ error: 'telegramId and adId are required' });
    }

    const user = await ensureUserExists(telegramId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.favorites = (user.favorites || []).filter(
      (favoriteId) => favoriteId && favoriteId.toString() !== adId
    );

    await user.save();

    res.json({ ok: true, favorites: user.favorites });
  } catch (error) {
    console.error('POST /api/favorites/remove error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
