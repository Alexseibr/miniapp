import express from 'express';
import DigitalTwinService from '../../services/DigitalTwinService.js';
import User from '../../models/User.js';

const router = express.Router();

async function getUserId(req) {
  const telegramId = req.telegramId || req.headers['x-telegram-id'];
  if (!telegramId) {
    return null;
  }

  const user = await User.findOne({ telegramId: Number(telegramId) });
  return user?._id;
}

router.get('/me', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const withSummary = req.query.withSummary === 'true';

    const twin = await DigitalTwinService.getTwin(userId);
    const stats = await DigitalTwinService.getStats(userId);

    const response = {
      interests: twin.interests,
      watchItems: twin.watchItems,
      preferences: twin.preferences,
      recommendations: twin.getUnreadRecommendations().slice(0, 10),
      stats,
    };

    if (withSummary) {
      response.aiSummary = await DigitalTwinService.getAISummary(userId);
    }

    res.json(response);
  } catch (error) {
    console.error('[TwinAPI] GET /me error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const summary = await DigitalTwinService.getAISummary(userId);
    res.json({ summary });
  } catch (error) {
    console.error('[TwinAPI] GET /summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/watch-items', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const watchItems = await DigitalTwinService.getWatchItems(userId);
    res.json({ watchItems });
  } catch (error) {
    console.error('[TwinAPI] GET /watch-items error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/watch-items', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, query, categoryId, maxPrice, minPrice, radiusKm, onlyNearby, notifyOnNew, notifyOnPriceDrop, notifyOnFirstMatch, tags } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const watchItem = await DigitalTwinService.addWatchItem(userId, {
      title,
      query: query || title,
      categoryId,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      radiusKm: radiusKm ? Number(radiusKm) : undefined,
      onlyNearby: Boolean(onlyNearby),
      notifyOnNew: notifyOnNew !== false,
      notifyOnPriceDrop: notifyOnPriceDrop !== false,
      notifyOnFirstMatch: Boolean(notifyOnFirstMatch),
      tags: tags || [],
    });

    res.status(201).json({ watchItem });
  } catch (error) {
    console.error('[TwinAPI] POST /watch-items error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/watch-items/:id', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const updates = req.body;

    const watchItem = await DigitalTwinService.updateWatchItem(userId, id, updates);
    res.json({ watchItem });
  } catch (error) {
    console.error('[TwinAPI] PATCH /watch-items/:id error:', error);
    if (error.message === 'WatchItem not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

router.patch('/watch-items/:id/toggle', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { isActive } = req.body;

    const watchItem = await DigitalTwinService.toggleWatchItem(userId, id, Boolean(isActive));
    res.json({ watchItem });
  } catch (error) {
    console.error('[TwinAPI] PATCH /watch-items/:id/toggle error:', error);
    if (error.message === 'WatchItem not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

router.delete('/watch-items/:id', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    await DigitalTwinService.deleteWatchItem(userId, id);
    res.json({ success: true });
  } catch (error) {
    console.error('[TwinAPI] DELETE /watch-items/:id error:', error);
    if (error.message === 'WatchItem not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

router.get('/suggestions', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const lat = req.query.lat ? parseFloat(req.query.lat) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng) : undefined;
    const radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm) : undefined;

    const suggestions = await DigitalTwinService.getSuggestions(userId, { lat, lng, radiusKm });
    res.json(suggestions);
  } catch (error) {
    console.error('[TwinAPI] GET /suggestions error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/recommendations', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    const recommendations = await DigitalTwinService.getRecommendations(userId, limit);
    res.json({ recommendations });
  } catch (error) {
    console.error('[TwinAPI] GET /recommendations error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/recommendations/read', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { ids } = req.body;

    await DigitalTwinService.markRecommendationsRead(userId, ids);
    res.json({ success: true });
  } catch (error) {
    console.error('[TwinAPI] POST /recommendations/read error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/preferences', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const preferences = await DigitalTwinService.updatePreferences(userId, req.body);
    res.json({ preferences });
  } catch (error) {
    console.error('[TwinAPI] PATCH /preferences error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/track', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type, query, adId, categoryId, tags } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Event type is required' });
    }

    await DigitalTwinService.trackEvent(userId, {
      type,
      query,
      adId,
      categoryId,
      tags,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[TwinAPI] POST /track error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { message, lat, lng, radiusKm } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await DigitalTwinService.aiChat(userId, message, {
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radiusKm: radiusKm ? parseFloat(radiusKm) : undefined,
    });

    res.json(response);
  } catch (error) {
    console.error('[TwinAPI] POST /chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await DigitalTwinService.getStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('[TwinAPI] GET /stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
