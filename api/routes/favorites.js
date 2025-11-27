import express from 'express';
import { Router } from 'express';
import Favorite from '../../models/Favorite.js';
import Ad from '../../models/Ad.js';

const router = Router();

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
    console.log('[Favorites] Getting favorites for user:', userTelegramId);
    
    if (!userTelegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const favorites = await Favorite.find({ userTelegramId })
      .populate('adId')
      .lean();

    console.log('[Favorites] Raw favorites count:', favorites.length);
    if (favorites.length > 0) {
      console.log('[Favorites] First favorite adId type:', typeof favorites[0].adId);
      console.log('[Favorites] First favorite adId:', JSON.stringify(favorites[0].adId).slice(0, 200));
    }

    // Преобразуем формат: adId (populated) → ad
    const items = favorites.map((fav) => {
      const adData = fav.adId && typeof fav.adId === 'object' ? fav.adId : null;
      return {
        adId: adData?._id?.toString() || (typeof fav.adId === 'string' ? fav.adId : fav.adId?.toString()),
        ad: adData,
        createdAt: fav.createdAt,
        notifyOnPriceChange: fav.notifyOnPriceChange,
        notifyOnStatusChange: fav.notifyOnStatusChange,
      };
    });

    console.log('[Favorites] Transformed items count:', items.length);
    if (items.length > 0) {
      console.log('[Favorites] First item has ad:', !!items[0].ad);
    }

    res.json({ items, count: items.length });
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

export default router;
