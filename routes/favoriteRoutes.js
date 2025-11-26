import { Router } from 'express';
import { telegramInitDataMiddleware } from '../middleware/telegramAuth.js';
import requireAuth from '../middleware/requireAuth.js';
import Favorite from '../models/Favorite.js';
import Ad from '../models/Ad.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js';

const router = Router();

router.use(telegramInitDataMiddleware, requireAuth);

function getUserTelegramId(req) {
  return req.currentUser?.telegramId || req.telegramAuth?.user?.id || null;
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function trackFavoriteEvent(telegramId, adId, eventType, metadata = {}) {
  try {
    await AnalyticsEvent.create({
      eventType: `favorite_${eventType}`,
      sellerTelegramId: telegramId,
      adId,
      timestamp: new Date(),
      metadata,
    });
  } catch (err) {
    console.error('[Favorites] Analytics tracking error:', err.message);
  }
}

router.get('/my', async (req, res) => {
  try {
    const telegramId = getUserTelegramId(req);
    
    if (!telegramId) {
      return res.json({ items: [], count: 0 });
    }

    const userLat = parseFloat(req.query.lat) || null;
    const userLng = parseFloat(req.query.lng) || null;

    const favorites = await Favorite.find({ 
      userTelegramId: String(telegramId),
    }).sort({ createdAt: -1 });

    const adIds = favorites.map(f => f.adId);
    const ads = await Ad.find({ _id: { $in: adIds } }).lean();
    const adsMap = new Map(ads.map(ad => [ad._id.toString(), ad]));

    const items = favorites.map(fav => {
      const ad = adsMap.get(fav.adId.toString()) || null;
      if (!ad) return null;

      let distanceKm = null;
      if (userLat && userLng && ad.location?.lat && ad.location?.lng) {
        distanceKm = calculateDistance(userLat, userLng, ad.location.lat, ad.location.lng);
      }

      return {
        _id: fav._id,
        adId: fav.adId.toString(),
        userTelegramId: fav.userTelegramId,
        notifyOnPriceChange: fav.notifyOnPriceChange,
        notifyOnStatusChange: fav.notifyOnStatusChange,
        createdAt: fav.createdAt,
        ad: {
          ...ad,
          _id: ad._id.toString(),
          distanceKm: distanceKm ? Math.round(distanceKm * 10) / 10 : null,
        },
      };
    }).filter(item => item !== null);

    if (userLat && userLng) {
      items.sort((a, b) => {
        const distA = a.ad.distanceKm ?? Infinity;
        const distB = b.ad.distanceKm ?? Infinity;
        return distA - distB;
      });
    }

    return res.json({ items, count: items.length });
  } catch (error) {
    console.error('[Favorites] Failed to load favorites:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/toggle', async (req, res) => {
  try {
    const { adId, notifyOnPriceChange = true, notifyOnStatusChange = true } = req.body;
    const telegramId = getUserTelegramId(req);

    if (!telegramId || !adId) {
      return res.status(400).json({ error: 'Missing telegramId or adId' });
    }

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    const existing = await Favorite.findOne({
      userTelegramId: String(telegramId),
      adId,
    });

    if (existing) {
      await Favorite.deleteOne({ _id: existing._id });
      
      await Ad.updateOne(
        { _id: adId },
        { 
          $inc: { favoritesCount: -1 },
          $pull: { watchers: telegramId },
        }
      );

      await trackFavoriteEvent(telegramId, adId, 'remove');

      return res.json({
        status: 'removed',
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
      { 
        $inc: { favoritesCount: 1 },
        $addToSet: { watchers: telegramId },
      }
    );

    await trackFavoriteEvent(telegramId, adId, 'add');

    return res.json({
      status: 'added',
      isFavorite: true,
      notifyOnPriceChange: newFavorite.notifyOnPriceChange,
      notifyOnStatusChange: newFavorite.notifyOnStatusChange,
    });
  } catch (error) {
    console.error('[Favorites] Failed to toggle favorite:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { adId, notifyOnPriceChange = true, notifyOnStatusChange = true } = req.body;
    const telegramId = getUserTelegramId(req);

    if (!telegramId || !adId) {
      return res.status(400).json({ error: 'Missing telegramId or adId' });
    }

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    const existing = await Favorite.findOne({
      userTelegramId: String(telegramId),
      adId,
    });

    if (!existing) {
      await Favorite.create({
        userTelegramId: String(telegramId),
        adId,
        notifyOnPriceChange,
        notifyOnStatusChange,
      });

      await Ad.updateOne(
        { _id: adId },
        { 
          $inc: { favoritesCount: 1 },
          $addToSet: { watchers: telegramId },
        }
      );

      await trackFavoriteEvent(telegramId, adId, 'add');
    }

    return res.json({ ok: true, status: 'added' });
  } catch (error) {
    console.error('[Favorites] Failed to add favorite:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:adId', async (req, res) => {
  try {
    const { adId } = req.params;
    const telegramId = getUserTelegramId(req);

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
        { 
          $inc: { favoritesCount: -1 },
          $pull: { watchers: telegramId },
        }
      );

      await trackFavoriteEvent(telegramId, adId, 'remove');
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('[Favorites] Failed to remove favorite:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:adId/settings', async (req, res) => {
  try {
    const { adId } = req.params;
    const { notifyOnPriceChange, notifyOnStatusChange } = req.body;
    const telegramId = getUserTelegramId(req);

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
    console.error('[Favorites] Failed to update favorite settings:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/check/:adId', async (req, res) => {
  try {
    const { adId } = req.params;
    const telegramId = getUserTelegramId(req);

    if (!telegramId) {
      return res.json({ isFavorite: false });
    }

    const existing = await Favorite.findOne({
      userTelegramId: String(telegramId),
      adId,
    });

    return res.json({
      isFavorite: !!existing,
      notifyOnPriceChange: existing?.notifyOnPriceChange || false,
      notifyOnStatusChange: existing?.notifyOnStatusChange || false,
    });
  } catch (error) {
    console.error('[Favorites] Failed to check favorite:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
