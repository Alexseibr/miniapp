import { Router } from 'express';
import { telegramInitDataMiddleware } from '../middleware/telegramAuth.js';
import requireAuth from '../middleware/requireAuth.js';
import Favorite from '../models/Favorite.js';
import Ad from '../models/Ad.js';

const router = Router();

router.use(telegramInitDataMiddleware, requireAuth);

router.get('/my', async (req, res) => {
  try {
    const telegramId = req.query.telegramId || req.currentUser?.telegramId;
    
    if (!telegramId) {
      return res.json({ items: [], count: 0 });
    }

    const favorites = await Favorite.find({ 
      userTelegramId: String(telegramId),
    }).sort({ createdAt: -1 });

    const adIds = favorites.map(f => f.adId);
    const ads = await Ad.find({ _id: { $in: adIds } });
    const adsMap = new Map(ads.map(ad => [ad._id.toString(), ad]));

    const items = favorites.map(fav => ({
      _id: fav._id,
      adId: fav.adId.toString(),
      userTelegramId: fav.userTelegramId,
      notifyOnPriceChange: fav.notifyOnPriceChange,
      notifyOnStatusChange: fav.notifyOnStatusChange,
      createdAt: fav.createdAt,
      ad: adsMap.get(fav.adId.toString()) || null,
    })).filter(item => item.ad !== null);

    return res.json({ items, count: items.length });
  } catch (error) {
    console.error('Failed to load favorites', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/toggle', async (req, res) => {
  try {
    const { adId, isFavorite, notifyOnPriceChange = true, notifyOnStatusChange = true } = req.body;
    const telegramId = req.body.telegramId || req.currentUser?.telegramId;

    if (!telegramId || !adId) {
      return res.status(400).json({ error: 'Missing telegramId or adId' });
    }

    const existing = await Favorite.findOne({
      userTelegramId: String(telegramId),
      adId,
    });

    if (isFavorite === true && existing) {
      await Favorite.deleteOne({ _id: existing._id });
      
      await Ad.updateOne(
        { _id: adId },
        { $inc: { favoritesCount: -1 } }
      );

      return res.json({
        isFavorite: false,
        notifyOnPriceChange: false,
        notifyOnStatusChange: false,
      });
    }
    
    if (isFavorite === false && !existing) {
      const newFavorite = await Favorite.create({
        userTelegramId: String(telegramId),
        adId,
        notifyOnPriceChange,
        notifyOnStatusChange,
      });

      await Ad.updateOne(
        { _id: adId },
        { $inc: { favoritesCount: 1 } }
      );

      return res.json({
        isFavorite: true,
        notifyOnPriceChange: newFavorite.notifyOnPriceChange,
        notifyOnStatusChange: newFavorite.notifyOnStatusChange,
      });
    }

    if (existing) {
      await Favorite.deleteOne({ _id: existing._id });
      
      await Ad.updateOne(
        { _id: adId },
        { $inc: { favoritesCount: -1 } }
      );

      return res.json({
        isFavorite: false,
        notifyOnPriceChange: false,
        notifyOnStatusChange: false,
      });
    }

    const newFavorite = await Favorite.create({
      userTelegramId: String(telegramId),
      adId,
      notifyOnPriceChange,
      notifyOnStatusChange,
    });

    await Ad.updateOne(
      { _id: adId },
      { $inc: { favoritesCount: 1 } }
    );

    return res.json({
      isFavorite: true,
      notifyOnPriceChange: newFavorite.notifyOnPriceChange,
      notifyOnStatusChange: newFavorite.notifyOnStatusChange,
    });
  } catch (error) {
    console.error('Failed to toggle favorite', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/add', async (req, res) => {
  try {
    const { adId, telegramId: bodyTelegramId } = req.body;
    const telegramId = bodyTelegramId || req.currentUser?.telegramId;

    if (!telegramId || !adId) {
      return res.status(400).json({ error: 'Missing telegramId or adId' });
    }

    const existing = await Favorite.findOne({
      userTelegramId: String(telegramId),
      adId,
    });

    if (!existing) {
      await Favorite.create({
        userTelegramId: String(telegramId),
        adId,
        notifyOnPriceChange: true,
        notifyOnStatusChange: true,
      });

      await Ad.updateOne(
        { _id: adId },
        { $inc: { favoritesCount: 1 } }
      );
    }

    const favorites = await Favorite.find({ 
      userTelegramId: String(telegramId),
    });

    const adIds = favorites.map(f => f.adId);
    const ads = await Ad.find({ _id: { $in: adIds } });
    const adsMap = new Map(ads.map(ad => [ad._id.toString(), ad]));

    const items = favorites.map(fav => ({
      _id: fav._id,
      adId: fav.adId.toString(),
      ad: adsMap.get(fav.adId.toString()) || null,
    })).filter(item => item.ad !== null);

    return res.json({ ok: true, items });
  } catch (error) {
    console.error('Failed to add favorite', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:adId', async (req, res) => {
  try {
    const { adId } = req.params;
    const telegramId = req.body?.telegramId || req.currentUser?.telegramId;

    if (!telegramId) {
      return res.status(400).json({ error: 'Missing telegramId' });
    }

    const existing = await Favorite.findOne({
      userTelegramId: String(telegramId),
      adId,
    });

    if (existing) {
      await Favorite.deleteOne({ _id: existing._id });
      
      await Ad.updateOne(
        { _id: adId },
        { $inc: { favoritesCount: -1 } }
      );
    }

    const favorites = await Favorite.find({ 
      userTelegramId: String(telegramId),
    });

    const adIds = favorites.map(f => f.adId);
    const ads = await Ad.find({ _id: { $in: adIds } });
    const adsMap = new Map(ads.map(ad => [ad._id.toString(), ad]));

    const items = favorites.map(fav => ({
      _id: fav._id,
      adId: fav.adId.toString(),
      ad: adsMap.get(fav.adId.toString()) || null,
    })).filter(item => item.ad !== null);

    return res.json({ ok: true, items });
  } catch (error) {
    console.error('Failed to remove favorite', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:adId/settings', async (req, res) => {
  try {
    const { adId } = req.params;
    const { notifyOnPriceChange, notifyOnStatusChange } = req.body;
    const telegramId = req.body?.telegramId || req.currentUser?.telegramId;

    if (!telegramId) {
      return res.status(400).json({ error: 'Missing telegramId' });
    }

    const favorite = await Favorite.findOne({
      userTelegramId: String(telegramId),
      adId,
    });

    if (!favorite) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    if (typeof notifyOnPriceChange === 'boolean') {
      favorite.notifyOnPriceChange = notifyOnPriceChange;
    }
    if (typeof notifyOnStatusChange === 'boolean') {
      favorite.notifyOnStatusChange = notifyOnStatusChange;
    }

    await favorite.save();

    return res.json({
      adId: favorite.adId,
      notifyOnPriceChange: favorite.notifyOnPriceChange,
      notifyOnStatusChange: favorite.notifyOnStatusChange,
    });
  } catch (error) {
    console.error('Failed to update favorite settings', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
