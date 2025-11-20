const express = require('express');
const Favorite = require('../../models/Favorite');
const Ad = require('../../models/Ad');
const { auth } = require('../../middleware/auth');
const { cacheMiddleware, cacheClient } = require('../middleware/cache');

const router = express.Router();

const FAVORITES_CACHE_PREFIX = 'favorites:';

router.use(auth);

router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode < 500) {
        cacheClient.flushPrefix(FAVORITES_CACHE_PREFIX);
      }
    });
  }
  next();
});

// GET /api/favorites/my
router.get(
  '/my',
  cacheMiddleware(
    (req) =>
      req.currentUser?._id
        ? `${FAVORITES_CACHE_PREFIX}my:${req.currentUser._id.toString()}`
        : null,
    20,
  ),
  async (req, res, next) => {
  try {
    const favorites = await Favorite.find({ user: req.currentUser._id })
      .populate({
        path: 'ad',
        select: 'title price images photos category subcategory',
      })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = favorites
      .filter((favorite) => favorite.ad)
      .map((favorite) => ({
        ad: favorite.ad,
        createdAt: favorite.createdAt,
      }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

// GET /api/favorites/ids
router.get('/ids', async (req, res, next) => {
  try {
    const favorites = await Favorite.find({ user: req.currentUser._id })
      .select('ad adId')
      .lean();

    const adIds = favorites
      .map((favorite) => favorite.ad || favorite.adId)
      .filter(Boolean)
      .map((id) => String(id));

    res.json({ adIds });
  } catch (err) {
    next(err);
  }
});

// POST /api/favorites/:adId
router.post('/:adId', async (req, res, next) => {
  try {
    const { adId } = req.params;

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    try {
      const favorite = await Favorite.create({ user: req.currentUser._id, ad: ad._id });
      return res.status(201).json({ ok: true, favorite });
    } catch (error) {
      if (error?.code === 11000) {
        return res.json({ ok: true });
      }
      throw error;
    }
  } catch (err) {
    next(err);
  }
});

// DELETE /api/favorites/:adId
router.delete('/:adId', async (req, res, next) => {
  try {
    const { adId } = req.params;
    await Favorite.findOneAndDelete({ user: req.currentUser._id, ad: adId });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
