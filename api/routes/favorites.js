const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Ad = require('../../models/Ad');

async function getUserByTelegram(req, res) {
  const tgId = req.header('X-Telegram-Id');

  if (!tgId) {
    res.status(401).json({ error: 'X-Telegram-Id header is required' });
    return null;
  }

  const telegramId = Number(tgId);
  if (!Number.isFinite(telegramId)) {
    res.status(400).json({ error: 'X-Telegram-Id must be a number' });
    return null;
  }

  let user = await User.findOne({ telegramId });

  if (!user) {
    user = await User.create({ telegramId, role: 'buyer' });
  }

  return user;
}

router.get('/my', async (req, res) => {
  try {
    const user = await getUserByTelegram(req, res);
    if (!user) return;

    await user.populate('favorites.adId');

    const items = (user.favorites || [])
      .filter((favorite) => Boolean(favorite.adId))
      .map((favorite) => ({
        adId: favorite.adId._id,
        ad: favorite.adId,
        notifyOnPrice: favorite.notifyOnPrice,
        notifyOnStatus: favorite.notifyOnStatus,
        addedAt: favorite.addedAt,
      }));

    res.json({ items });
  } catch (error) {
    console.error('GET /api/favorites/my error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:adId', async (req, res) => {
  try {
    const user = await getUserByTelegram(req, res);
    if (!user) return;

    const { adId } = req.params;
    const { notifyOnPrice = true, notifyOnStatus = true } = req.body || {};

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    const existing = (user.favorites || []).find(
      (favorite) => favorite.adId && favorite.adId.toString() === adId
    );

    if (existing) {
      existing.notifyOnPrice = notifyOnPrice;
      existing.notifyOnStatus = notifyOnStatus;
    } else {
      user.favorites.push({
        adId,
        notifyOnPrice,
        notifyOnStatus,
      });
    }

    await user.save();

    res.json({ ok: true });
  } catch (error) {
    console.error('POST /api/favorites/:adId error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:adId', async (req, res) => {
  try {
    const user = await getUserByTelegram(req, res);
    if (!user) return;

    const { adId } = req.params;
    user.favorites = (user.favorites || []).filter(
      (favorite) => favorite.adId && favorite.adId.toString() !== adId
    );

    await user.save();

    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/favorites/:adId error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
