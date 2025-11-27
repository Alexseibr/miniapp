import express from 'express';
import MonetizationService from '../../services/MonetizationService.js';
import FarmerSubscription from '../../models/FarmerSubscription.js';

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { telegramId } = req.query;
    
    if (!telegramId) {
      return res.status(400).json({
        success: false,
        error: 'telegramId is required',
      });
    }

    const result = await MonetizationService.getCurrentTier(Number(telegramId));
    
    const TIER_LIMITS = {
      FREE: 3,
      PRO: 15,
      MAX: 999,
    };

    res.json({
      success: true,
      data: {
        tier: result.tier,
        maxAdsPerDay: TIER_LIMITS[result.tier] || 3,
        usedToday: result.usedToday || 0,
        featuresEnabled: result.features || [],
        expiresAt: result.expiresAt || null,
        isPremiumActive: result.tier !== 'FREE',
      },
    });
  })
);

router.get(
  '/tiers',
  asyncHandler(async (req, res) => {
    const tiers = MonetizationService.getAllTiers();
    res.json({
      success: true,
      data: { tiers },
    });
  })
);

router.get(
  '/current',
  asyncHandler(async (req, res) => {
    const { telegramId } = req.query;
    
    if (!telegramId) {
      return res.status(400).json({
        success: false,
        error: 'telegramId is required',
      });
    }

    const result = await MonetizationService.getCurrentTier(Number(telegramId));
    res.json({
      success: true,
      data: result,
    });
  })
);

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const { telegramId } = req.query;
    
    if (!telegramId) {
      return res.status(400).json({
        success: false,
        error: 'telegramId is required',
      });
    }

    const stats = await MonetizationService.getSubscriptionStats(Number(telegramId));
    res.json({
      success: true,
      data: stats,
    });
  })
);

router.post(
  '/upgrade',
  asyncHandler(async (req, res) => {
    const { telegramId, tier } = req.body;
    
    if (!telegramId || !tier) {
      return res.status(400).json({
        success: false,
        error: 'telegramId and tier are required',
      });
    }

    try {
      const subscription = await MonetizationService.upgradeTier(Number(telegramId), tier);
      res.json({
        success: true,
        data: { subscription },
        message: `Подписка ${tier.toUpperCase()} активирована`,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  })
);

router.post(
  '/boost',
  asyncHandler(async (req, res) => {
    const { telegramId, adId } = req.body;
    
    if (!telegramId || !adId) {
      return res.status(400).json({
        success: false,
        error: 'telegramId and adId are required',
      });
    }

    const result = await MonetizationService.boostAd(Number(telegramId), adId);
    res.json(result);
  })
);

router.post(
  '/premium-card',
  asyncHandler(async (req, res) => {
    const { telegramId, adId } = req.body;
    
    if (!telegramId || !adId) {
      return res.status(400).json({
        success: false,
        error: 'telegramId and adId are required',
      });
    }

    const result = await MonetizationService.enablePremiumCard(Number(telegramId), adId);
    res.json(result);
  })
);

router.post(
  '/cancel',
  asyncHandler(async (req, res) => {
    const { telegramId } = req.body;
    
    if (!telegramId) {
      return res.status(400).json({
        success: false,
        error: 'telegramId is required',
      });
    }

    const subscription = await FarmerSubscription.findOne({
      telegramId: Number(telegramId),
      status: 'active',
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Active subscription not found',
      });
    }

    subscription.status = 'cancelled';
    await subscription.save();

    res.json({
      success: true,
      message: 'Подписка отменена. Доступ сохранится до конца оплаченного периода.',
    });
  })
);

export default router;
