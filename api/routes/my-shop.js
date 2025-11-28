import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import SellerProfile from '../../models/SellerProfile.js';
import Ad from '../../models/Ad.js';

const router = Router();

async function ensureProfile(user) {
  let profile = await SellerProfile.findOne({ userId: user._id });

  if (!profile) {
    const fallbackName = user.username || user.firstName || 'Мой магазин';
    const slug = await SellerProfile.generateSlug(fallbackName);

    profile = new SellerProfile({
      userId: user._id,
      telegramId: user.telegramId,
      slug,
      name: fallbackName,
      phone: user.phone || null,
      telegramUsername: user.username || null,
      showPhone: true,
    });

    await profile.save();
  }

  return profile;
}

function mapStatus(ad, now) {
  if (ad.status === 'draft') return 'draft';
  if (ad.status === 'expired' || (ad.expiresAt && ad.expiresAt <= now)) {
    return 'expired';
  }
  return 'active';
}

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const profile = await ensureProfile(req.currentUser);

    return res.json({
      success: true,
      profile: {
        id: profile._id,
        name: profile.name,
        description: profile.description,
        address: profile.address,
        instagram: profile.instagram,
        phone: profile.phone,
        messengers: profile.messengers || {},
        telegramUsername: profile.telegramUsername,
      },
    });
  } catch (error) {
    console.error('[MyShop] Failed to load profile', error);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const profile = await ensureProfile(req.currentUser);

    const allowedFields = [
      'name',
      'description',
      'address',
      'instagram',
      'phone',
      'messengers',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        profile[field] = req.body[field];
      }
    });

    if (req.body.messengers) {
      profile.messengers = {
        ...(profile.messengers?.toObject?.()
          ? profile.messengers.toObject()
          : profile.messengers || {}),
        ...req.body.messengers,
      };
    }

    if (req.body.name && req.body.name !== profile.name) {
      profile.slug = await SellerProfile.generateSlug(req.body.name);
    }

    await profile.save();

    return res.json({
      success: true,
      profile: {
        id: profile._id,
        name: profile.name,
        description: profile.description,
        address: profile.address,
        instagram: profile.instagram,
        phone: profile.phone,
        messengers: profile.messengers || {},
        telegramUsername: profile.telegramUsername,
      },
    });
  } catch (error) {
    console.error('[MyShop] Failed to update profile', error);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
});

router.get('/products', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const profile = await ensureProfile(req.currentUser);
    const { status, limit = 20, offset = 0 } = req.query;

    const numericLimit = Math.min(parseInt(limit) || 20, 100);
    const numericOffset = parseInt(offset) || 0;

    const baseFilter = { sellerTelegramId: profile.telegramId };
    let statusFilter = {};

    if (status === 'draft') {
      statusFilter = { status: 'draft' };
    } else if (status === 'expired') {
      statusFilter = {
        $or: [
          { status: 'expired' },
          { expiresAt: { $lte: now } },
        ],
      };
    } else if (status === 'active') {
      statusFilter = {
        status: { $in: ['active', 'scheduled'] },
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: now } },
        ],
      };
    }

    const [items, total, draftCount, expiredCount, activeCount] = await Promise.all([
      Ad.find({ ...baseFilter, ...statusFilter })
        .sort({ createdAt: -1 })
        .skip(numericOffset)
        .limit(numericLimit)
        .select('title price currency status photos previewUrl description categoryId expiresAt createdAt')
        .lean(),
      Ad.countDocuments({ ...baseFilter, ...statusFilter }),
      Ad.countDocuments({ ...baseFilter, status: 'draft' }),
      Ad.countDocuments({
        ...baseFilter,
        $or: [
          { status: 'expired' },
          { expiresAt: { $lte: now } },
        ],
      }),
      Ad.countDocuments({
        ...baseFilter,
        status: { $in: ['active', 'scheduled'] },
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: now } },
        ],
      }),
    ]);

    const responseItems = items.map((ad) => ({
      id: ad._id,
      title: ad.title,
      price: ad.price,
      currency: ad.currency,
      status: mapStatus(ad, now),
      preview: ad.photos?.[0] || ad.previewUrl || null,
      description: ad.description,
      categoryId: ad.categoryId,
      expiresAt: ad.expiresAt,
      createdAt: ad.createdAt,
    }));

    return res.json({
      success: true,
      items: responseItems,
      total,
      limit: numericLimit,
      offset: numericOffset,
      counts: {
        active: activeCount,
        draft: draftCount,
        expired: expiredCount,
      },
    });
  } catch (error) {
    console.error('[MyShop] Failed to load products', error);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
});

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const profile = await ensureProfile(req.currentUser);
    const baseFilter = { sellerTelegramId: profile.telegramId };

    const [totalProducts, activeProducts, expiredProducts, aggregates] = await Promise.all([
      Ad.countDocuments(baseFilter),
      Ad.countDocuments({
        ...baseFilter,
        status: { $in: ['active', 'scheduled'] },
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: now } },
        ],
      }),
      Ad.countDocuments({
        ...baseFilter,
        $or: [
          { status: 'expired' },
          { expiresAt: { $lte: now } },
        ],
      }),
      Ad.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: null,
            totalViews: { $sum: { $ifNull: ['$viewsTotal', 0] } },
            totalFavorites: { $sum: { $ifNull: ['$favoritesCount', 0] } },
          },
        },
      ]),
    ]);

    const stats = {
      totalProducts,
      activeProducts,
      expiredProducts,
      totalViews: aggregates[0]?.totalViews || 0,
      totalFavorites: aggregates[0]?.totalFavorites || 0,
    };

    return res.json({ success: true, stats });
  } catch (error) {
    console.error('[MyShop] Failed to load stats', error);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
});

export default router;
