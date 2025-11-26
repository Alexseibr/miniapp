import express from 'express';
import SellerAnalyticsEngine from '../../services/SellerAnalyticsEngine.js';
import AnalyticsEvent from '../../models/AnalyticsEvent.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';

const router = express.Router();

router.get('/overview', requireAuth, async (req, res) => {
  try {
    const sellerId = req.query.sellerId || req.user._id;
    const period = parseInt(req.query.period) || 7;

    if (req.query.sellerId && req.user.role !== 'admin' && req.query.sellerId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const overview = await SellerAnalyticsEngine.getOverview(sellerId, period);
    res.json({ success: true, overview });
  } catch (error) {
    console.error('[SellerAnalytics] Overview error:', error);
    res.status(500).json({ error: 'Failed to get overview' });
  }
});

router.get('/views', requireAuth, async (req, res) => {
  try {
    const sellerId = req.query.sellerId || req.user._id;
    const days = parseInt(req.query.days) || 30;

    if (req.query.sellerId && req.user.role !== 'admin' && req.query.sellerId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const timeline = await SellerAnalyticsEngine.getViewsTimeline(sellerId, days);
    res.json({ success: true, timeline });
  } catch (error) {
    console.error('[SellerAnalytics] Views error:', error);
    res.status(500).json({ error: 'Failed to get views timeline' });
  }
});

router.get('/contacts', requireAuth, async (req, res) => {
  try {
    const sellerId = req.query.sellerId || req.user._id;
    const days = parseInt(req.query.days) || 30;

    if (req.query.sellerId && req.user.role !== 'admin' && req.query.sellerId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const timeline = await SellerAnalyticsEngine.getContactsTimeline(sellerId, days);
    res.json({ success: true, timeline });
  } catch (error) {
    console.error('[SellerAnalytics] Contacts error:', error);
    res.status(500).json({ error: 'Failed to get contacts timeline' });
  }
});

router.get('/category-performance', requireAuth, async (req, res) => {
  try {
    const sellerId = req.query.sellerId || req.user._id;
    const days = parseInt(req.query.days) || 30;

    if (req.query.sellerId && req.user.role !== 'admin' && req.query.sellerId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const categories = await SellerAnalyticsEngine.getCategoryPerformance(sellerId, days);
    res.json({ success: true, categories });
  } catch (error) {
    console.error('[SellerAnalytics] Category performance error:', error);
    res.status(500).json({ error: 'Failed to get category performance' });
  }
});

router.get('/price-position', requireAuth, async (req, res) => {
  try {
    const sellerId = req.query.sellerId || req.user._id;

    if (req.query.sellerId && req.user.role !== 'admin' && req.query.sellerId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const prices = await SellerAnalyticsEngine.getPricePosition(sellerId);
    res.json({ success: true, prices });
  } catch (error) {
    console.error('[SellerAnalytics] Price position error:', error);
    res.status(500).json({ error: 'Failed to get price position' });
  }
});

router.get('/demand-heatmap', requireAuth, async (req, res) => {
  try {
    const sellerId = req.query.sellerId || req.user._id;
    const radiusKm = parseFloat(req.query.radiusKm) || 20;

    if (req.query.sellerId && req.user.role !== 'admin' && req.query.sellerId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const heatmap = await SellerAnalyticsEngine.getDemandHeatmap(sellerId, radiusKm);
    res.json({ success: true, heatmap });
  } catch (error) {
    console.error('[SellerAnalytics] Demand heatmap error:', error);
    res.status(500).json({ error: 'Failed to get demand heatmap' });
  }
});

router.get('/hotspots', requireAuth, async (req, res) => {
  try {
    const sellerId = req.query.sellerId || req.user._id;
    const days = parseInt(req.query.days) || 30;

    if (req.query.sellerId && req.user.role !== 'admin' && req.query.sellerId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const hotspots = await SellerAnalyticsEngine.getHotspots(sellerId, days);
    res.json({ success: true, hotspots });
  } catch (error) {
    console.error('[SellerAnalytics] Hotspots error:', error);
    res.status(500).json({ error: 'Failed to get hotspots' });
  }
});

router.get('/subscribers', requireAuth, async (req, res) => {
  try {
    const sellerId = req.query.sellerId || req.user._id;
    const days = parseInt(req.query.days) || 30;

    if (req.query.sellerId && req.user.role !== 'admin' && req.query.sellerId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const subscribers = await SellerAnalyticsEngine.getSubscribersStats(sellerId, days);
    res.json({ success: true, subscribers });
  } catch (error) {
    console.error('[SellerAnalytics] Subscribers error:', error);
    res.status(500).json({ error: 'Failed to get subscribers' });
  }
});

router.get('/suggestions', requireAuth, async (req, res) => {
  try {
    const sellerId = req.query.sellerId || req.user._id;
    const userLocation = req.query.lat && req.query.lng 
      ? { lat: parseFloat(req.query.lat), lng: parseFloat(req.query.lng) }
      : null;

    if (req.query.sellerId && req.user.role !== 'admin' && req.query.sellerId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const suggestions = await SellerAnalyticsEngine.getAISuggestions(sellerId, userLocation);
    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('[SellerAnalytics] Suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

router.get('/warnings', requireAuth, async (req, res) => {
  try {
    const sellerId = req.query.sellerId || req.user._id;

    if (req.query.sellerId && req.user.role !== 'admin' && req.query.sellerId !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const warnings = await SellerAnalyticsEngine.getWarnings(sellerId);
    res.json({ success: true, warnings });
  } catch (error) {
    console.error('[SellerAnalytics] Warnings error:', error);
    res.status(500).json({ error: 'Failed to get warnings' });
  }
});

router.post('/track', optionalAuth, async (req, res) => {
  try {
    const { sellerId, adId, type, geo, categoryId, metadata } = req.body;

    if (!sellerId || !type) {
      return res.status(400).json({ error: 'sellerId and type are required' });
    }

    const validTypes = ['view', 'store_view', 'contact', 'favorite', 'unfavorite', 
                        'search_hit', 'price_view', 'share', 'message', 'call'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    const event = await AnalyticsEvent.trackEvent({
      userId: req.user?._id,
      sellerId,
      adId,
      type,
      geo,
      categoryId,
      metadata,
      platform: req.headers['x-platform'] || 'telegram',
    });

    res.json({ success: true, eventId: event._id });
  } catch (error) {
    console.error('[SellerAnalytics] Track event error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

router.get('/admin/all-sellers', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const days = parseInt(req.query.days) || 7;
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sellerStats = await AnalyticsEvent.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$sellerId',
          totalEvents: { $sum: 1 },
          views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
          contacts: { $sum: { $cond: [{ $eq: ['$type', 'contact'] }, 1, 0] } },
          favorites: { $sum: { $cond: [{ $eq: ['$type', 'favorite'] }, 1, 0] } },
        },
      },
      { $sort: { totalEvents: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);

    res.json({ 
      success: true, 
      sellers: sellerStats,
      page,
      limit,
    });
  } catch (error) {
    console.error('[SellerAnalytics] Admin sellers error:', error);
    res.status(500).json({ error: 'Failed to get sellers analytics' });
  }
});

export default router;
