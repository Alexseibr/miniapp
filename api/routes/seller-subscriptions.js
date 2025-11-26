import { Router } from 'express';
import SellerProfile from '../../models/SellerProfile.js';
import SellerSubscription from '../../models/SellerSubscription.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = Router();

router.post('/:sellerId', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    const { sellerId } = req.params;
    const { notifyNewProducts = true, notifyPriceDrops = true, notifySeasonal = true } = req.body;
    
    const profile = await SellerProfile.findBySlugOrId(sellerId);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
        message: 'Магазин не найден',
      });
    }
    
    if (profile.userId.equals(user._id)) {
      return res.status(400).json({
        success: false,
        error: 'self_subscribe',
        message: 'Нельзя подписаться на свой магазин',
      });
    }
    
    const existing = await SellerSubscription.findOne({
      userId: user._id,
      sellerId: profile._id,
    });
    
    if (existing) {
      existing.notifyNewProducts = notifyNewProducts;
      existing.notifyPriceDrops = notifyPriceDrops;
      existing.notifySeasonal = notifySeasonal;
      await existing.save();
      
      return res.json({
        success: true,
        message: 'Настройки подписки обновлены',
        subscription: existing,
      });
    }
    
    const subscription = new SellerSubscription({
      userId: user._id,
      userTelegramId: user.telegramId,
      sellerId: profile._id,
      sellerTelegramId: profile.telegramId,
      notifyNewProducts,
      notifyPriceDrops,
      notifySeasonal,
    });
    
    await subscription.save();
    
    profile.subscribersCount = await SellerSubscription.getSubscribersCount(profile._id);
    await profile.save();
    
    console.log(`[SellerSubscription] User ${user.telegramId} subscribed to seller ${profile.name}`);
    
    res.status(201).json({
      success: true,
      message: 'Вы подписались на магазин',
      subscription,
      subscribersCount: profile.subscribersCount,
    });
  } catch (error) {
    console.error('[SellerSubscription] Subscribe error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
    });
  }
});

router.delete('/:sellerId', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    const { sellerId } = req.params;
    
    const profile = await SellerProfile.findBySlugOrId(sellerId);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
      });
    }
    
    const subscription = await SellerSubscription.findOneAndDelete({
      userId: user._id,
      sellerId: profile._id,
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'not_subscribed',
        message: 'Вы не подписаны на этот магазин',
      });
    }
    
    profile.subscribersCount = await SellerSubscription.getSubscribersCount(profile._id);
    await profile.save();
    
    console.log(`[SellerSubscription] User ${user.telegramId} unsubscribed from seller ${profile.name}`);
    
    res.json({
      success: true,
      message: 'Вы отписались от магазина',
      subscribersCount: profile.subscribersCount,
    });
  } catch (error) {
    console.error('[SellerSubscription] Unsubscribe error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
    });
  }
});

router.get('/:sellerId/status', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    const { sellerId } = req.params;
    
    const profile = await SellerProfile.findBySlugOrId(sellerId);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
      });
    }
    
    const subscription = await SellerSubscription.findOne({
      userId: user._id,
      sellerId: profile._id,
    });
    
    res.json({
      success: true,
      isSubscribed: !!subscription,
      subscription,
      subscribersCount: profile.subscribersCount,
    });
  } catch (error) {
    console.error('[SellerSubscription] Status error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
    });
  }
});

router.get('/my', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [subscriptions, total] = await Promise.all([
      SellerSubscription.find({ userId: user._id })
        .populate('sellerId', 'name avatar isFarmer slug ratings subscribersCount productsCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      SellerSubscription.countDocuments({ userId: user._id }),
    ]);
    
    res.json({
      success: true,
      subscriptions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('[SellerSubscription] My subscriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
    });
  }
});

router.put('/:sellerId/settings', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    const { sellerId } = req.params;
    const { notifyNewProducts, notifyPriceDrops, notifySeasonal } = req.body;
    
    const profile = await SellerProfile.findBySlugOrId(sellerId);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
      });
    }
    
    const subscription = await SellerSubscription.findOne({
      userId: user._id,
      sellerId: profile._id,
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'not_subscribed',
      });
    }
    
    if (notifyNewProducts !== undefined) {
      subscription.notifyNewProducts = notifyNewProducts;
    }
    if (notifyPriceDrops !== undefined) {
      subscription.notifyPriceDrops = notifyPriceDrops;
    }
    if (notifySeasonal !== undefined) {
      subscription.notifySeasonal = notifySeasonal;
    }
    
    await subscription.save();
    
    res.json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error('[SellerSubscription] Update settings error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
    });
  }
});

export default router;
