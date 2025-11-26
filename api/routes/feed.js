import { Router } from 'express';
import Ad from '../../models/Ad.js';
import UserFeedEvent from '../../models/UserFeedEvent.js';
import { telegramInitDataMiddleware } from '../../middleware/telegramAuth.js';

const router = Router();

router.use(telegramInitDataMiddleware);

router.get('/', async (req, res) => {
  try {
    const {
      radiusKm = 20,
      limit = 20,
      cursor,
      lat,
      lng,
    } = req.query;

    const userLat = parseFloat(lat) || req.currentUser?.location?.lat;
    const userLng = parseFloat(lng) || req.currentUser?.location?.lng;

    if (!userLat || !userLng) {
      return res.status(400).json({
        error: 'Coordinates required',
        message: 'Не удалось определить местоположение. Передайте lat/lng или сохраните геолокацию в профиле.',
      });
    }

    const radiusMeters = parseFloat(radiusKm) * 1000;
    const limitNum = Math.min(parseInt(limit), 50);

    let matchStage = {
      status: 'active',
      moderationStatus: 'approved',
      'photos.0': { $exists: true },
    };

    if (cursor) {
      try {
        const [cursorId, cursorDate] = cursor.split('_');
        matchStage.$or = [
          { createdAt: { $lt: new Date(cursorDate) } },
          { createdAt: new Date(cursorDate), _id: { $lt: cursorId } },
        ];
      } catch (e) {
        console.warn('Invalid cursor format:', cursor);
      }
    }

    const pipeline = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [userLng, userLat],
          },
          distanceField: 'distanceMeters',
          maxDistance: radiusMeters,
          spherical: true,
          key: 'location.geo',
        },
      },
      { $match: matchStage },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: limitNum + 1 },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          photos: 1,
          city: 1,
          geoLabel: 1,
          district: '$geoLabel',
          location: 1,
          categoryId: 1,
          subcategoryId: 1,
          createdAt: 1,
          price: 1,
          currency: 1,
          distanceMeters: 1,
          sellerTelegramId: 1,
          sellerName: 1,
          sellerUsername: 1,
        },
      },
    ];

    const results = await Ad.aggregate(pipeline);

    let hasMore = false;
    let nextCursor = null;

    if (results.length > limitNum) {
      hasMore = true;
      results.pop();
      const lastItem = results[results.length - 1];
      nextCursor = `${lastItem._id}_${lastItem.createdAt.toISOString()}`;
    }

    const items = results.map((ad) => ({
      _id: ad._id,
      title: ad.title,
      description: ad.description || '',
      images: ad.photos || [],
      city: ad.city || '',
      district: ad.geoLabel || ad.district || '',
      geo: ad.location?.geo || null,
      categoryId: ad.categoryId,
      subcategoryId: ad.subcategoryId,
      createdAt: ad.createdAt,
      price: ad.price,
      currency: ad.currency || 'RUB',
      distanceMeters: Math.round(ad.distanceMeters || 0),
      sellerName: ad.sellerName,
      sellerUsername: ad.sellerUsername,
    }));

    return res.json({
      items,
      nextCursor,
      hasMore,
      radiusKm: parseFloat(radiusKm),
      total: items.length,
    });
  } catch (error) {
    console.error('Feed API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/events', async (req, res) => {
  try {
    const { events } = req.body;
    const userId = req.currentUser?._id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'events array is required and must not be empty',
      });
    }

    const validEventTypes = ['impression', 'view_open', 'like', 'dislike', 'scroll_next', 'scroll_prev'];

    const validatedEvents = events.filter((event) => {
      if (!event.adId || !event.eventType) {
        return false;
      }
      if (!validEventTypes.includes(event.eventType)) {
        return false;
      }
      return true;
    });

    if (validatedEvents.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid events provided. Each event must have adId and valid eventType.',
      });
    }

    const documents = validatedEvents.map((event) => ({
      userId,
      adId: event.adId,
      eventType: event.eventType,
      dwellTimeMs: event.dwellTimeMs || null,
      positionIndex: event.positionIndex ?? null,
      radiusKm: event.radiusKm || 20,
      meta: event.meta || {},
      createdAt: new Date(),
    }));

    await UserFeedEvent.insertMany(documents, { ordered: false });

    for (const event of validatedEvents) {
      if (event.eventType === 'like') {
        await Ad.updateOne(
          { _id: event.adId },
          { $inc: { likesCount: 1 } }
        ).catch(() => {});
      }
    }

    return res.json({
      success: true,
      saved: documents.length,
    });
  } catch (error) {
    console.error('Feed events API error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const userId = req.currentUser?._id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [likesCount, impressionsCount, viewsCount] = await Promise.all([
      UserFeedEvent.countDocuments({ userId, eventType: 'like' }),
      UserFeedEvent.countDocuments({ userId, eventType: 'impression' }),
      UserFeedEvent.countDocuments({ userId, eventType: 'view_open' }),
    ]);

    return res.json({
      likes: likesCount,
      impressions: impressionsCount,
      views: viewsCount,
    });
  } catch (error) {
    console.error('Feed stats API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
