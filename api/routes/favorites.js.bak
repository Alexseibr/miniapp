const express = require('express');
const Favorite = require('../../models/Favorite');
const Ad = require('../../models/Ad');

const router = express.Router();

function getUserTelegramId(req) {
  const fromUser = req.user?.telegramId;
  const fromTelegramAuth = req.telegramAuth?.user?.id || req.telegramUser?.id;
  const id = fromUser || fromTelegramAuth;
  return id ? String(id) : null;
}

// GET /api/favorites/my
router.get('/my', async (req, res, next) => {
  try {
    const userTelegramId = getUserTelegramId(req);
    if (!userTelegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const favorites = await Favorite.find({ userTelegramId })
      .populate('adId')
      .lean();

    res.json(favorites);
  } catch (err) {
    next(err);
  }
});

// POST /api/favorites
// body: { adId, notifyOnPriceChange?, notifyOnStatusChange? }
router.post('/', async (req, res, next) => {
  try {
    const userTelegramId = getUserTelegramId(req);
    if (!userTelegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      adId,
      notifyOnPriceChange = true,
      notifyOnStatusChange = true,
    } = req.body;

    const ad = await Ad.findById(adId);
    if (!ad) return res.status(404).json({ error: 'Ad not found' });

    const favorite = await Favorite.findOneAndUpdate(
      { userTelegramId, adId },
      { notifyOnPriceChange, notifyOnStatusChange },
      { new: true, upsert: true }
    );

    res.status(201).json(favorite);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/favorites/:adId
router.delete('/:adId', async (req, res, next) => {
  try {
    const userTelegramId = getUserTelegramId(req);
    if (!userTelegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { adId } = req.params;

    await Favorite.findOneAndDelete({ userTelegramId, adId });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
