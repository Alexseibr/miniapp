import { Router } from 'express';
import SellerProfile from '../../models/SellerProfile.js';
import SellerSubscription from '../../models/SellerSubscription.js';
import SellerReview from '../../models/SellerReview.js';
import Ad from '../../models/Ad.js';
import User from '../../models/User.js';
import { authMiddleware, optionalAuth } from '../../middleware/auth.js';

const router = Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    
    const existing = await SellerProfile.findOne({ 
      $or: [
        { userId: user._id },
        { telegramId: user.telegramId }
      ]
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'seller_exists',
        message: 'Магазин уже существует',
        profile: existing,
      });
    }
    
    const {
      name,
      avatar,
      banner,
      description,
      isFarmer,
      phone,
      instagram,
      telegramUsername,
      address,
      geo,
      city,
      cityCode,
      workingHours,
      deliveryInfo,
      tags,
      role,
      canDeliver,
      deliveryRadiusKm,
      defaultDeliveryPrice,
      verificationLevel,
      baseLocation,
    } = req.body;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'invalid_name',
        message: 'Название магазина должно содержать минимум 2 символа',
      });
    }
    
    const slug = await SellerProfile.generateSlug(name);
    
    const profile = new SellerProfile({
      userId: user._id,
      telegramId: user.telegramId,
      slug,
      name: name.trim(),
      avatar,
      banner,
      description: description?.trim(),
      isFarmer: Boolean(isFarmer),
      phone: phone || user.phone,
      instagram,
      telegramUsername: telegramUsername || user.username,
      address,
      geo: geo ? {
        type: 'Point',
        coordinates: [geo.lng || geo.coordinates?.[0], geo.lat || geo.coordinates?.[1]],
      } : null,
      city,
      cityCode,
      workingHours,
      deliveryInfo,
      tags: tags || [],
      role: role || 'SHOP',
      canDeliver: Boolean(canDeliver),
      deliveryRadiusKm: deliveryRadiusKm ?? null,
      defaultDeliveryPrice: defaultDeliveryPrice ?? null,
      verificationLevel: verificationLevel || null,
      baseLocation: baseLocation || undefined,
    });
    
    await profile.save();
    await profile.updateProductsCount();
    
    console.log(`[SellerProfile] Created store "${name}" for user ${user.telegramId}`);
    
    res.status(201).json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('[SellerProfile] Create error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка создания магазина',
    });
  }
});

router.put('/', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    
    const profile = await SellerProfile.findOne({ userId: user._id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
        message: 'Магазин не найден',
      });
    }
    
    const allowedFields = [
      'name', 'avatar', 'banner', 'description', 'isFarmer',
      'phone', 'instagram', 'telegramUsername', 'address',
      'city', 'cityCode', 'region', 'workingHours', 'deliveryInfo',
      'showPhone', 'tags', 'role', 'canDeliver', 'deliveryRadiusKm',
      'defaultDeliveryPrice', 'verificationLevel', 'baseLocation',
      'isVerified',
    ];
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        profile[field] = req.body[field];
      }
    }
    
    if (req.body.geo) {
      profile.geo = {
        type: 'Point',
        coordinates: [
          req.body.geo.lng || req.body.geo.coordinates?.[0],
          req.body.geo.lat || req.body.geo.coordinates?.[1],
        ],
      };
    }
    
    if (req.body.name && req.body.name !== profile.name) {
      profile.slug = await SellerProfile.generateSlug(req.body.name);
    }
    
    await profile.save();
    
    console.log(`[SellerProfile] Updated store "${profile.name}"`);
    
    res.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('[SellerProfile] Update error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка обновления магазина',
    });
  }
});

router.get('/my', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    
    let profile = await SellerProfile.findOne({ userId: user._id });
    
    if (!profile) {
      const slug = await SellerProfile.generateSlug('Мой магазин');
      profile = new SellerProfile({
        userId: user._id,
        telegramId: user.telegramId,
        slug,
        name: 'Мой магазин',
        phone: user.phone || null,
        telegramUsername: user.username || null,
        showPhone: true,
      });
      await profile.save();
      console.log(`[SellerProfile] Auto-created store for user ${user.telegramId}`);
    }
    
    await profile.updateProductsCount();
    
    res.json({
      success: true,
      profile,
      hasStore: true,
    });
  } catch (error) {
    console.error('[SellerProfile] Get my store error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
    });
  }
});

router.get('/my/ads', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    const { status, page = 1, limit = 50 } = req.query;
    
    const profile = await SellerProfile.findOne({ userId: user._id });
    
    if (!profile) {
      return res.json({
        success: true,
        items: [],
        total: 0,
      });
    }
    
    const query = { sellerTelegramId: profile.telegramId };
    
    if (status) {
      if (status === 'hidden') {
        query.status = { $in: ['hidden', 'archived'] };
      } else {
        query.status = status;
      }
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [items, total] = await Promise.all([
      Ad.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('_id title price currency photos status viewsTotal favoritesCount createdAt unitType isFarmerAd categoryId')
        .lean(),
      Ad.countDocuments(query),
    ]);
    
    res.json({
      success: true,
      items,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('[SellerProfile] Get my ads error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
    });
  }
});

router.get('/my/stats', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    
    const profile = await SellerProfile.findOne({ userId: user._id });
    
    if (!profile) {
      return res.json({
        success: true,
        stats: {
          totalAds: 0,
          activeAds: 0,
          hiddenAds: 0,
          viewsLast7Days: 0,
          contactClicksLast7Days: 0,
          topAds: [],
        },
      });
    }
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const [adStats, topAds, recentAdsViews] = await Promise.all([
      Ad.aggregate([
        { $match: { sellerTelegramId: profile.telegramId } },
        {
          $group: {
            _id: null,
            totalAds: { $sum: 1 },
            activeAds: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
            },
            hiddenAds: {
              $sum: { $cond: [{ $in: ['$status', ['hidden', 'archived']] }, 1, 0] },
            },
            totalViews: { $sum: '$viewsTotal' },
            totalContactClicks: { $sum: { $ifNull: ['$contactRevealCount', 0] } },
          },
        },
      ]),
      Ad.find({ sellerTelegramId: profile.telegramId, status: 'active' })
        .sort({ viewsTotal: -1 })
        .limit(3)
        .select('_id title viewsTotal photos')
        .lean(),
      Ad.aggregate([
        { 
          $match: { 
            sellerTelegramId: profile.telegramId,
            updatedAt: { $gte: sevenDaysAgo },
          } 
        },
        {
          $group: {
            _id: null,
            viewsLast7Days: { $sum: '$viewsToday' },
          },
        },
      ]),
    ]);
    
    const stats = adStats[0] || {
      totalAds: 0,
      activeAds: 0,
      hiddenAds: 0,
      totalViews: 0,
      totalContactClicks: 0,
    };
    
    res.json({
      success: true,
      stats: {
        totalAds: stats.totalAds,
        activeAds: stats.activeAds,
        hiddenAds: stats.hiddenAds,
        viewsLast7Days: recentAdsViews[0]?.viewsLast7Days || stats.totalViews,
        contactClicksLast7Days: profile.analytics?.contactOpens || stats.totalContactClicks,
        topAds: topAds.map(ad => ({
          _id: ad._id,
          title: ad.title,
          viewsCount: ad.viewsTotal || 0,
          photo: ad.photos?.[0] || null,
        })),
      },
    });
  } catch (error) {
    console.error('[SellerProfile] Get my stats error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
    });
  }
});

router.get('/:identifier', optionalAuth, async (req, res) => {
  try {
    const { identifier } = req.params;
    
    let profile = await SellerProfile.findBySlugOrId(identifier);
    
    if (!profile) {
      const telegramId = parseInt(identifier);
      if (!isNaN(telegramId)) {
        profile = await SellerProfile.findOne({ telegramId });
      }
    }
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
        message: 'Магазин не найден',
      });
    }
    
    if (profile.isBlocked) {
      return res.status(403).json({
        success: false,
        error: 'blocked',
        message: 'Магазин заблокирован',
      });
    }
    
    await profile.incrementView();
    
    let isSubscribed = false;
    let isOwner = false;
    
    if (req.currentUser) {
      isSubscribed = await SellerSubscription.isSubscribed(req.currentUser._id, profile._id);
      isOwner = profile.userId.equals(req.currentUser._id);
    }
    
    const reviewStats = await SellerReview.getSellerStats(profile._id);
    
    res.json({
      success: true,
      profile,
      isSubscribed,
      isOwner,
      reviewStats,
    });
  } catch (error) {
    console.error('[SellerProfile] Get by identifier error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
    });
  }
});

router.get('/:identifier/items', optionalAuth, async (req, res) => {
  try {
    const { identifier } = req.params;
    const { page = 1, limit = 20, sort = 'newest', categoryId } = req.query;
    
    let profile = await SellerProfile.findBySlugOrId(identifier);
    
    if (!profile) {
      const telegramId = parseInt(identifier);
      if (!isNaN(telegramId)) {
        profile = await SellerProfile.findOne({ telegramId });
      }
    }
    
    if (!profile || profile.isBlocked) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
      });
    }
    
    const query = {
      sellerTelegramId: profile.telegramId,
      status: 'active',
    };
    
    if (categoryId) {
      query.categoryId = categoryId;
    }
    
    let sortOption = { createdAt: -1 };
    switch (sort) {
      case 'price_asc':
        sortOption = { price: 1 };
        break;
      case 'price_desc':
        sortOption = { price: -1 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'popular':
        sortOption = { viewsCount: -1, createdAt: -1 };
        break;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [items, total] = await Promise.all([
      Ad.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Ad.countDocuments(query),
    ]);
    
    const categories = await Ad.aggregate([
      { $match: { sellerTelegramId: profile.telegramId, status: 'active' } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    
    res.json({
      success: true,
      items,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      categories,
    });
  } catch (error) {
    console.error('[SellerProfile] Get items error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
    });
  }
});

router.get('/:identifier/analytics', authMiddleware, async (req, res) => {
  try {
    const { identifier } = req.params;
    const { days = 7 } = req.query;
    
    let profile = await SellerProfile.findBySlugOrId(identifier);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
      });
    }
    
    if (!profile.userId.equals(req.currentUser._id)) {
      return res.status(403).json({
        success: false,
        error: 'forbidden',
        message: 'Доступ запрещен',
      });
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const [productStats, recentSubscribers, reviewStats] = await Promise.all([
      Ad.aggregate([
        { 
          $match: { 
            sellerTelegramId: profile.telegramId,
            status: 'active',
          } 
        },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalViews: { $sum: '$viewsCount' },
            avgPrice: { $avg: '$price' },
          },
        },
      ]),
      SellerSubscription.find({ sellerId: profile._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'firstName lastName username'),
      SellerReview.getSellerStats(profile._id),
    ]);
    
    res.json({
      success: true,
      analytics: {
        storeViews: profile.analytics.totalViews || 0,
        productViews: productStats[0]?.totalViews || 0,
        subscribersCount: profile.subscribersCount,
        productsCount: productStats[0]?.totalProducts || 0,
        contactOpens: profile.analytics.contactOpens || 0,
        avgPrice: Math.round(productStats[0]?.avgPrice || 0),
        rating: reviewStats.avgRating,
        reviewsCount: reviewStats.totalReviews,
        recentSubscribers,
        period: parseInt(days),
      },
    });
  } catch (error) {
    console.error('[SellerProfile] Get analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
    });
  }
});

router.post('/:identifier/contact', optionalAuth, async (req, res) => {
  try {
    const { identifier } = req.params;
    
    let profile = await SellerProfile.findBySlugOrId(identifier);
    
    if (!profile || profile.isBlocked) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
      });
    }
    
    await profile.incrementContactOpen();
    
    res.json({
      success: true,
      contact: {
        phone: profile.phone,
        telegramUsername: profile.telegramUsername,
        instagram: profile.instagram,
      },
    });
  } catch (error) {
    console.error('[SellerProfile] Contact open error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
    });
  }
});

router.get('/search/all', optionalAuth, async (req, res) => {
  try {
    const { 
      q, 
      isFarmer, 
      city, 
      lat, 
      lng, 
      radius = 50,
      sort = 'rating',
      page = 1, 
      limit = 20,
    } = req.query;
    
    const query = { isActive: true, isBlocked: false };
    
    if (q) {
      query.$text = { $search: q };
    }
    
    if (isFarmer === 'true') {
      query.isFarmer = true;
    }
    
    if (city) {
      query.cityCode = city.toLowerCase();
    }
    
    let sortOption = { 'ratings.score': -1, subscribersCount: -1 };
    switch (sort) {
      case 'subscribers':
        sortOption = { subscribersCount: -1 };
        break;
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'products':
        sortOption = { productsCount: -1 };
        break;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let profiles;
    let total;
    
    if (lat && lng) {
      const geoQuery = {
        ...query,
        geo: {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)],
            },
            $maxDistance: parseInt(radius) * 1000,
          },
        },
      };
      
      profiles = await SellerProfile.find(geoQuery)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
      
      total = await SellerProfile.countDocuments(geoQuery);
    } else {
      [profiles, total] = await Promise.all([
        SellerProfile.find(query)
          .sort(sortOption)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        SellerProfile.countDocuments(query),
      ]);
    }
    
    res.json({
      success: true,
      profiles,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('[SellerProfile] Search error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
    });
  }
});

export default router;
