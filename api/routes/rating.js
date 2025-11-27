import { Router } from 'express';
import { telegramInitDataMiddleware } from '../../middleware/telegramAuth.js';
import requireAuth from '../../middleware/requireAuth.js';
import RatingService from '../../services/RatingService.js';
import Ad from '../../models/Ad.js';
import User from '../../models/User.js';
import ContactEvent from '../../models/ContactEvent.js';
import AdFeedback from '../../models/AdFeedback.js';

const router = Router();

const optionalAuth = (req, res, next) => {
  try {
    telegramInitDataMiddleware(req, res, () => {
      next();
    });
  } catch (e) {
    next();
  }
};

router.post('/ads/:adId/contact', optionalAuth, async (req, res) => {
  try {
    const { adId } = req.params;
    const { channel } = req.body;
    
    if (!channel || !['telegram', 'phone', 'instagram', 'whatsapp'].includes(channel)) {
      return res.status(400).json({ error: 'Invalid channel' });
    }
    
    const ad = await Ad.findById(adId).lean();
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }
    
    const seller = await User.findOne({ telegramId: ad.sellerTelegramId });
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    
    const buyerId = req.currentUser?._id || null;
    const buyerTelegramId = req.currentUser?.telegramId || req.body.buyerTelegramId || null;
    
    const contact = await RatingService.logContact(
      adId,
      seller._id,
      ad.sellerTelegramId,
      buyerId,
      buyerTelegramId,
      channel
    );
    
    return res.json({
      success: true,
      contactId: contact._id,
      expiresAt: new Date(contact.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
    });
  } catch (error) {
    console.error('[Rating API] Error logging contact:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/ads/:adId/feedback', telegramInitDataMiddleware, requireAuth, async (req, res) => {
  try {
    const { adId } = req.params;
    const { contactId, score, reasonCode, comment } = req.body;
    
    if (!contactId) {
      return res.status(400).json({ error: 'Contact ID required' });
    }
    
    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Score must be between 1 and 5' });
    }
    
    if (score <= 3 && !reasonCode) {
      return res.status(400).json({ error: 'Reason required for low scores' });
    }
    
    const validReasons = ['no_response', 'wrong_price', 'wrong_description', 'fake', 'rude', 'other'];
    if (reasonCode && !validReasons.includes(reasonCode)) {
      return res.status(400).json({ error: 'Invalid reason code' });
    }
    
    const ad = await Ad.findById(adId).lean();
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }
    
    const seller = await User.findOne({ telegramId: ad.sellerTelegramId });
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    
    const feedback = await RatingService.submitFeedback(
      adId,
      seller._id,
      ad.sellerTelegramId,
      req.currentUser._id,
      req.currentUser.telegramId,
      contactId,
      score,
      reasonCode,
      comment
    );
    
    return res.json({
      success: true,
      feedbackId: feedback._id,
    });
  } catch (error) {
    console.error('[Rating API] Error submitting feedback:', error);
    
    if (error.message === 'Contact event not found') {
      return res.status(404).json({ error: 'Contact event not found or expired' });
    }
    if (error.message === 'Contact event does not match ad') {
      return res.status(400).json({ error: 'Contact event does not match ad' });
    }
    if (error.message === 'Feedback already submitted for this ad') {
      return res.status(409).json({ error: 'You have already submitted feedback for this ad' });
    }
    if (error.message === 'Reason code required for low scores') {
      return res.status(400).json({ error: 'Reason code required for low scores' });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/ads/:adId/rating', async (req, res) => {
  try {
    const { adId } = req.params;
    
    const summary = await RatingService.getAdRatingSummary(adId);
    if (!summary) {
      return res.status(404).json({ error: 'Ad not found' });
    }
    
    return res.json(summary);
  } catch (error) {
    console.error('[Rating API] Error getting ad rating:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/sellers/:sellerId/rating', async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    const summary = await RatingService.getSellerRatingSummary(sellerId);
    if (!summary) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    
    return res.json(summary);
  } catch (error) {
    console.error('[Rating API] Error getting seller rating:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/my/pending-feedback', telegramInitDataMiddleware, requireAuth, async (req, res) => {
  try {
    const pendingContacts = await RatingService.getPendingFeedbackForUser(
      req.currentUser._id,
      req.currentUser.telegramId
    );
    
    if (!pendingContacts.length) {
      return res.json({ items: [] });
    }
    
    const adIds = pendingContacts.map(c => c.adId);
    const ads = await Ad.find({ _id: { $in: adIds } })
      .select('title photos previewUrl price currency')
      .lean();
    
    const adsMap = new Map(ads.map(ad => [ad._id.toString(), ad]));
    
    const items = pendingContacts.map(contact => ({
      contactId: contact._id,
      adId: contact.adId,
      channel: contact.channel,
      createdAt: contact.createdAt,
      ad: adsMap.get(contact.adId.toString()) || null,
    }));
    
    return res.json({ items });
  } catch (error) {
    console.error('[Rating API] Error getting pending feedback:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/my/feedback-history', telegramInitDataMiddleware, requireAuth, async (req, res) => {
  try {
    const feedback = await AdFeedback.find({
      $or: [
        { buyerId: req.currentUser._id },
        { buyerTelegramId: String(req.currentUser.telegramId) },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    if (!feedback.length) {
      return res.json({ items: [] });
    }
    
    const adIds = feedback.map(f => f.adId);
    const ads = await Ad.find({ _id: { $in: adIds } })
      .select('title photos previewUrl price currency')
      .lean();
    
    const adsMap = new Map(ads.map(ad => [ad._id.toString(), ad]));
    
    const items = feedback.map(f => ({
      feedbackId: f._id,
      adId: f.adId,
      score: f.score,
      reasonCode: f.reasonCode,
      comment: f.comment,
      createdAt: f.createdAt,
      ad: adsMap.get(f.adId.toString()) || null,
    }));
    
    return res.json({ items });
  } catch (error) {
    console.error('[Rating API] Error getting feedback history:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/check-feedback/:adId', telegramInitDataMiddleware, requireAuth, async (req, res) => {
  try {
    const { adId } = req.params;
    
    const canSubmit = await AdFeedback.canSubmitFeedback(
      adId,
      req.currentUser._id,
      req.currentUser.telegramId
    );
    
    const contact = await ContactEvent.findOne({
      adId,
      $or: [
        { buyerId: req.currentUser._id },
        { buyerTelegramId: String(req.currentUser.telegramId) },
      ],
      feedbackSubmitted: false,
    }).sort({ createdAt: -1 });
    
    return res.json({
      canSubmit,
      contactId: contact?._id || null,
      contactCreatedAt: contact?.createdAt || null,
    });
  } catch (error) {
    console.error('[Rating API] Error checking feedback status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
