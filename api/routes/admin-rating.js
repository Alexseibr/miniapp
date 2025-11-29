import { Router } from 'express';
import RatingService from '../../services/RatingService.js';
import Ad from '../../models/Ad.js';
import User from '../../models/User.js';
import ContactEvent from '../../models/ContactEvent.js';
import AdFeedback from '../../models/AdFeedback.js';

const router = Router();

router.get('/fraud/overview', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    const analytics = await RatingService.getFraudAnalytics(days);
    
    const suspiciousAdsCount = await Ad.countDocuments({ 'flags.suspicious': true });
    const hiddenByRatingCount = await Ad.countDocuments({ 
      status: 'hidden',
      'flags.suspiciousReason': { $in: ['low_rating', 'fraud_reports'] },
    });
    
    const suspiciousSellers = await User.countDocuments({
      'sellerRating.fraudFlags': { $gte: 2 },
    });
    
    return res.json({
      ...analytics,
      summary: {
        suspiciousAds: suspiciousAdsCount,
        hiddenByRating: hiddenByRatingCount,
        suspiciousSellers,
      },
    });
  } catch (error) {
    console.error('[Admin Rating API] Error getting fraud overview:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/fraud/suspicious-ads', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const suspiciousAds = await RatingService.getSuspiciousAds(limit);
    
    return res.json({ items: suspiciousAds });
  } catch (error) {
    console.error('[Admin Rating API] Error getting suspicious ads:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/fraud/suspicious-sellers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const suspiciousSellers = await RatingService.getSuspiciousSellers(limit);
    
    return res.json({ items: suspiciousSellers });
  } catch (error) {
    console.error('[Admin Rating API] Error getting suspicious sellers:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/ads/:adId/feedback', async (req, res) => {
  try {
    const { adId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    
    const feedback = await AdFeedback.find({ adId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    const buyerIds = feedback.map(f => f.buyerId).filter(Boolean);
    const users = await User.find({ _id: { $in: buyerIds } })
      .select('telegramId username firstName lastName')
      .lean();
    
    const usersMap = new Map(users.map(u => [u._id.toString(), u]));
    
    const items = feedback.map(f => ({
      ...f,
      buyer: f.buyerId ? usersMap.get(f.buyerId.toString()) : null,
    }));
    
    return res.json({ items });
  } catch (error) {
    console.error('[Admin Rating API] Error getting ad feedback:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/sellers/:sellerId/feedback', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    
    const feedback = await AdFeedback.find({ sellerId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    const adIds = feedback.map(f => f.adId);
    const ads = await Ad.find({ _id: { $in: adIds } })
      .select('title photos previewUrl price currency')
      .lean();
    
    const adsMap = new Map(ads.map(ad => [ad._id.toString(), ad]));
    
    const buyerIds = feedback.map(f => f.buyerId).filter(Boolean);
    const users = await User.find({ _id: { $in: buyerIds } })
      .select('telegramId username firstName lastName')
      .lean();
    
    const usersMap = new Map(users.map(u => [u._id.toString(), u]));
    
    const items = feedback.map(f => ({
      ...f,
      ad: adsMap.get(f.adId.toString()) || null,
      buyer: f.buyerId ? usersMap.get(f.buyerId.toString()) : null,
    }));
    
    return res.json({ items });
  } catch (error) {
    console.error('[Admin Rating API] Error getting seller feedback:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/ads/:adId/clear-flags', async (req, res) => {
  try {
    const { adId } = req.params;
    
    await Ad.findByIdAndUpdate(adId, {
      $set: {
        'flags.suspicious': false,
        'flags.suspiciousReason': null,
        'flags.markedAt': null,
      },
    });
    
    return res.json({ success: true });
  } catch (error) {
    console.error('[Admin Rating API] Error clearing ad flags:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/ads/:adId/mark-suspicious', async (req, res) => {
  try {
    const { adId } = req.params;
    const { reason } = req.body;
    
    if (!reason || !['low_rating', 'fraud_reports', 'manual'].includes(reason)) {
      return res.status(400).json({ error: 'Invalid reason' });
    }
    
    await Ad.findByIdAndUpdate(adId, {
      $set: {
        'flags.suspicious': true,
        'flags.suspiciousReason': reason,
        'flags.markedAt': new Date(),
      },
    });
    
    return res.json({ success: true });
  } catch (error) {
    console.error('[Admin Rating API] Error marking ad suspicious:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/ads/:adId/recalculate', async (req, res) => {
  try {
    const { adId } = req.params;
    
    const stats = await RatingService.recalculateAdRating(adId);
    if (!stats) {
      return res.status(404).json({ error: 'Ad not found' });
    }
    
    return res.json({ success: true, stats });
  } catch (error) {
    console.error('[Admin Rating API] Error recalculating ad rating:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/sellers/:sellerId/recalculate', async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    const stats = await RatingService.recalculateSellerRating(sellerId);
    if (!stats) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    
    return res.json({ success: true, stats });
  } catch (error) {
    console.error('[Admin Rating API] Error recalculating seller rating:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/contacts/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const contacts = await ContactEvent.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    const adIds = contacts.map(c => c.adId);
    const ads = await Ad.find({ _id: { $in: adIds } })
      .select('title photos previewUrl price currency')
      .lean();
    
    const adsMap = new Map(ads.map(ad => [ad._id.toString(), ad]));
    
    const items = contacts.map(c => ({
      ...c,
      ad: adsMap.get(c.adId.toString()) || null,
    }));
    
    return res.json({ items });
  } catch (error) {
    console.error('[Admin Rating API] Error getting recent contacts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
