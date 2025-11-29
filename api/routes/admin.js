import { Router } from 'express';
import Ad from '../../models/Ad.js';
import User from '../../models/User.js';
import AdHistoryEvent from '../../models/AdHistoryEvent.js';
import Category from '../../models/Category.js';
import CategoryProposal from '../../models/CategoryProposal.js';
import CategoryEvolutionService from '../../services/CategoryEvolutionService.js';
import SellerProfile from '../../models/SellerProfile.js';
import ShopRequest from '../../models/ShopRequest.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = Router();

router.get('/ads', async (req, res, next) => {
  try {
    const {
      status,
      moderationStatus,
      ownerPhone,
      search,
      limit = 20,
      page = 1,
    } = req.query;

    const filters = {};

    if (status) {
      filters.status = status;
    }

    if (moderationStatus) {
      filters.moderationStatus = moderationStatus;
    }

    if (ownerPhone) {
      const user = await User.findOne({ phone: ownerPhone });
      if (user) {
        filters.sellerTelegramId = user.telegramId;
      } else {
        return res.json({
          ads: [],
          total: 0,
          page: Number(page),
          totalPages: 0,
        });
      }
    }

    if (search) {
      filters.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const limitNum = Math.min(Number(limit), 100);
    const pageNum = Number(page);
    const skip = (pageNum - 1) * limitNum;

    const [ads, total] = await Promise.all([
      Ad.find(filters)
        .populate('sellerTelegramId', 'firstName lastName username phone telegramId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Ad.countDocuments(filters),
    ]);

    const adsWithOwner = ads.map(ad => ({
      ...ad,
      owner: ad.sellerTelegramId || null
    }));

    return res.json({
      ads: adsWithOwner,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

router.put('/ads/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['draft', 'active', 'sold', 'archived', 'hidden', 'expired', 'blocked'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const ad = await Ad.findById(id);

    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    ad.status = status;

    if (status === 'blocked' && reason) {
      ad.moderationStatus = 'rejected';
      ad.moderationComment = reason;
    } else if (status === 'active') {
      ad.moderationStatus = 'approved';
      ad.moderationComment = null;
    }

    await ad.save();

    return res.json(ad);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/ads/:id - полное удаление объявления (только для админов)
router.delete('/ads/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    const ad = await Ad.findById(id);
    if (!ad) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }

    if (permanent === 'true') {
      await Ad.findByIdAndDelete(id);
      return res.json({ 
        success: true, 
        message: 'Объявление удалено навсегда',
        deleted: true 
      });
    } else {
      ad.status = 'archived';
      await ad.save();
      return res.json({ 
        success: true, 
        message: 'Объявление архивировано', 
        ad 
      });
    }
  } catch (error) {
    next(error);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const {
      role,
      blocked,
      search,
      limit = 20,
      page = 1,
    } = req.query;

    const filters = {};

    if (role) {
      filters.role = role;
    }

    if (blocked !== undefined) {
      filters.isBlocked = blocked === 'true';
    }

    if (search) {
      filters.$or = [
        { username: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const limitNum = Math.min(Number(limit), 100);
    const pageNum = Number(page);
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filters),
    ]);

    return res.json({
      users,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

router.put('/users/:id/role', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    const validRoles = ['user', 'admin', 'seller', 'moderator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.role = role;

    if (role === 'moderator') {
      user.isModerator = true;
    } else if (user.isModerator && role !== 'moderator') {
      user.isModerator = false;
    }

    await user.save();

    return res.json(user);
  } catch (error) {
    next(error);
  }
});

router.put('/users/:id/block', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isBlocked, reason } = req.body;

    if (typeof isBlocked !== 'boolean') {
      return res.status(400).json({ error: 'isBlocked (boolean) is required' });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isBlocked = isBlocked;

    if (isBlocked && reason) {
      user.blockReason = reason;
    } else if (!isBlocked) {
      user.blockReason = undefined;
    }

    await user.save();

    return res.json(user);
  } catch (error) {
    next(error);
  }
});

router.get('/ads/:adId/history', async (req, res, next) => {
  try {
    const { adId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }

    const events = await AdHistoryEvent.getAdHistory(adId, limit);

    if (events.length === 0) {
      const syntheticEvents = [];

      if (ad.createdAt) {
        syntheticEvents.push({
          _id: `created-${adId}`,
          eventType: 'created',
          description: 'Объявление создано',
          timestamp: ad.createdAt,
          performedBy: ad.userId ? { type: 'user', id: String(ad.userId) } : { type: 'system' },
        });
      }

      if (ad.publishAt && ad.status === 'scheduled') {
        syntheticEvents.push({
          _id: `scheduled-${adId}`,
          eventType: 'scheduled',
          description: `Запланирована публикация на ${new Date(ad.publishAt).toLocaleString('ru-RU')}`,
          timestamp: ad.createdAt || new Date(),
          performedBy: { type: 'user', id: String(ad.userId) },
        });
      }

      if (ad.moderationStatus === 'approved') {
        syntheticEvents.push({
          _id: `moderation-approved-${adId}`,
          eventType: 'moderation',
          description: 'Объявление одобрено модератором',
          timestamp: ad.updatedAt || ad.createdAt,
          performedBy: { type: 'admin' },
        });
      } else if (ad.moderationStatus === 'rejected') {
        syntheticEvents.push({
          _id: `moderation-rejected-${adId}`,
          eventType: 'moderation',
          description: `Объявление отклонено: ${ad.moderationComment || 'без комментария'}`,
          timestamp: ad.updatedAt || ad.createdAt,
          performedBy: { type: 'admin' },
        });
      }

      if (ad.status === 'active' && ad.publishAt) {
        syntheticEvents.push({
          _id: `published-${adId}`,
          eventType: 'published',
          description: 'Объявление опубликовано',
          timestamp: ad.publishAt,
          performedBy: { type: 'system' },
        });
      }

      syntheticEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return res.json({ 
        events: syntheticEvents,
        synthetic: true,
        totalCount: syntheticEvents.length,
      });
    }

    return res.json({ 
      events,
      totalCount: events.length,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/ads/:adId/history', async (req, res, next) => {
  try {
    const { adId } = req.params;
    const { eventType, description, performedBy, changes, metadata } = req.body;

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }

    const event = await AdHistoryEvent.logEvent(adId, eventType, description, {
      performedBy,
      changes,
      metadata,
    });

    return res.json({ event });
  } catch (error) {
    next(error);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const [totalAds, activeAds, pendingAds, totalUsers] = await Promise.all([
      Ad.countDocuments(),
      Ad.countDocuments({ status: 'active' }),
      Ad.countDocuments({ moderationStatus: 'pending' }),
      User.countDocuments(),
    ]);

    return res.json({
      totalAds,
      activeAds,
      pendingAds,
      totalUsers,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/category-proposals', async (req, res, next) => {
  try {
    const { status = 'pending' } = req.query;
    
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    const proposals = await CategoryProposal.find(filter)
      .sort({ matchedAdsCount: -1, createdAt: -1 })
      .populate('parentCategoryId', 'name slug icon3d')
      .lean();

    return res.json({ proposals });
  } catch (error) {
    next(error);
  }
});

router.get('/category-proposals/stats', async (req, res, next) => {
  try {
    const stats = await CategoryEvolutionService.getStats();
    
    const proposalCounts = await CategoryProposal.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const counts = { pending: 0, approved: 0, rejected: 0 };
    proposalCounts.forEach(item => {
      counts[item._id] = item.count;
    });

    return res.json({ 
      otherCategoryStats: stats,
      proposalCounts: counts,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/category-proposals/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await CategoryEvolutionService.getProposalWithAds(id);
    
    if (!result) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    return res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/category-proposals/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, notes } = req.body;
    const adminId = req.admin?.telegramId || 0;

    const result = await CategoryEvolutionService.approveProposal(id, adminId, {
      name,
      slug,
      notes,
    });

    return res.json({
      success: true,
      proposal: result.proposal,
      newCategory: result.newCategory,
      movedAdsCount: result.movedAdsCount,
    });
  } catch (error) {
    if (error.message === 'Proposal not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith('Proposal already')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/category-proposals/:id/reject', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.admin?.telegramId || 0;

    const proposal = await CategoryEvolutionService.rejectProposal(id, adminId, reason);

    return res.json({
      success: true,
      proposal,
    });
  } catch (error) {
    if (error.message === 'Proposal not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith('Proposal already')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/category-proposals/analyze', async (req, res, next) => {
  try {
    const results = await CategoryEvolutionService.analyzeOtherCategories();

    return res.json({
      success: true,
      proposalsCreated: results.length,
      proposals: results,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/categories/other-stats', async (req, res, next) => {
  try {
    const otherCategories = await Category.find({ isOther: true }).select('slug parentSlug name');
    
    const stats = await Promise.all(
      otherCategories.map(async (cat) => {
        const count = await Ad.countDocuments({
          subcategoryId: cat.slug,
          needsCategoryReview: true,
        });
        return {
          slug: cat.slug,
          parentSlug: cat.parentSlug,
          name: cat.name,
          adsNeedingReview: count,
        };
      })
    );

    return res.json({
      categories: stats.filter(s => s.adsNeedingReview > 0).sort((a, b) => b.adsNeedingReview - a.adsNeedingReview),
    });
  } catch (error) {
    next(error);
  }
});

const requireAdmin = (req, res, next) => {
  if (!req.currentUser) {
    console.log('[Admin] Unauthorized - no currentUser');
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  const adminRoles = ['admin', 'super_admin', 'moderator'];
  console.log(`[Admin] User ${req.currentUser.telegramId} role: ${req.currentUser.role}`);
  
  if (!adminRoles.includes(req.currentUser.role)) {
    console.log(`[Admin] Forbidden - role ${req.currentUser.role} not in ${adminRoles.join(', ')}`);
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  
  next();
};

router.get('/sellers', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { filter, q, page = 1, limit = 50 } = req.query;
    
    const query = {};
    
    if (filter === 'pending') {
      query.isVerified = false;
      query.isBlocked = { $ne: true };
    } else if (filter === 'verified') {
      query.isVerified = true;
    } else if (filter === 'blocked') {
      query.isBlocked = true;
    }
    
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { slug: { $regex: q, $options: 'i' } },
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [sellers, total] = await Promise.all([
      SellerProfile.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      SellerProfile.countDocuments(query),
    ]);
    
    console.log(`[Admin] Fetched ${sellers.length} sellers, filter: ${filter}`);
    
    res.json({
      success: true,
      sellers,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('[Admin] Get sellers error:', error);
    res.status(500).json({ success: false, error: 'server_error' });
  }
});

router.get('/farmers', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { filter, q, page = 1, limit = 50 } = req.query;
    
    const query = { isFarmer: true };
    
    if (filter === 'pending') {
      query.isVerified = false;
      query.isBlocked = { $ne: true };
    } else if (filter === 'verified') {
      query.isVerified = true;
    } else if (filter === 'blocked') {
      query.isBlocked = true;
    }
    
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { slug: { $regex: q, $options: 'i' } },
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [farmers, total] = await Promise.all([
      SellerProfile.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      SellerProfile.countDocuments(query),
    ]);
    
    console.log(`[Admin] Fetched ${farmers.length} farmers, filter: ${filter}`);
    
    res.json({
      success: true,
      farmers,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('[Admin] Get farmers error:', error);
    res.status(500).json({ success: false, error: 'server_error' });
  }
});

router.post('/sellers/:id/verify', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { verified } = req.body;
    
    const seller = await SellerProfile.findById(id);
    
    if (!seller) {
      return res.status(404).json({ success: false, error: 'not_found' });
    }
    
    seller.isVerified = Boolean(verified);
    await seller.save();
    
    console.log(`[Admin] Seller ${seller.name} verified: ${verified} by ${req.currentUser.telegramId}`);
    
    res.json({
      success: true,
      seller,
    });
  } catch (error) {
    console.error('[Admin] Verify seller error:', error);
    res.status(500).json({ success: false, error: 'server_error' });
  }
});

router.post('/sellers/:id/block', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { blocked, reason } = req.body;
    
    const seller = await SellerProfile.findById(id);
    
    if (!seller) {
      return res.status(404).json({ success: false, error: 'not_found' });
    }
    
    seller.isBlocked = Boolean(blocked);
    seller.blockReason = reason || null;
    
    if (blocked) {
      seller.isVerified = false;
    }
    
    await seller.save();
    
    console.log(`[Admin] Seller ${seller.name} blocked: ${blocked} by ${req.currentUser.telegramId}`);
    
    res.json({
      success: true,
      seller,
    });
  } catch (error) {
    console.error('[Admin] Block seller error:', error);
    res.status(500).json({ success: false, error: 'server_error' });
  }
});

router.post('/sellers/:id/set-farmer', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isFarmer } = req.body;
    
    const seller = await SellerProfile.findById(id);
    
    if (!seller) {
      return res.status(404).json({ success: false, error: 'not_found' });
    }
    
    seller.isFarmer = Boolean(isFarmer);
    await seller.save();
    
    console.log(`[Admin] Seller ${seller.name} isFarmer: ${isFarmer} by ${req.currentUser.telegramId}`);
    
    res.json({
      success: true,
      seller,
    });
  } catch (error) {
    console.error('[Admin] Set farmer error:', error);
    res.status(500).json({ success: false, error: 'server_error' });
  }
});

router.get('/counts', authMiddleware, requireAdmin, async (req, res) => {
  try {
    console.log(`[Admin] GET /counts called by user ${req.currentUser?.telegramId}`);
    
    const [
      pendingSellers,
      pendingFarmers,
      pendingShopRequests,
      pendingAds,
    ] = await Promise.all([
      SellerProfile.countDocuments({ isVerified: false, isBlocked: { $ne: true } }),
      SellerProfile.countDocuments({ isFarmer: true, isVerified: false, isBlocked: { $ne: true } }),
      ShopRequest.countDocuments({ status: 'pending' }),
      Ad.countDocuments({ moderationStatus: 'pending' }),
    ]);
    
    console.log(`[Admin] Counts: sellers=${pendingSellers}, farmers=${pendingFarmers}, shopRequests=${pendingShopRequests}, ads=${pendingAds}`);
    
    res.json({
      success: true,
      counts: {
        pendingSellers,
        pendingFarmers,
        pendingShopRequests,
        pendingAds,
      },
    });
  } catch (error) {
    console.error('[Admin] Get counts error:', error);
    res.status(500).json({ success: false, error: 'server_error' });
  }
});

router.get('/shop-requests', authMiddleware, requireAdmin, async (req, res) => {
  try {
    console.log(`[Admin] GET /shop-requests called by user ${req.currentUser?.telegramId}`);
    
    const { status = 'pending', q, page = 1, limit = 50 } = req.query;
    
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { city: { $regex: q, $options: 'i' } },
      ];
    }
    
    console.log(`[Admin] Query:`, JSON.stringify(query));
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [requests, total] = await Promise.all([
      ShopRequest.find(query)
        .populate('userId', 'telegramId username firstName lastName phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ShopRequest.countDocuments(query),
    ]);
    
    console.log(`[Admin] Fetched ${requests.length} shop requests (total: ${total}), status: ${status}`);
    
    res.json({
      success: true,
      requests,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('[Admin] Get shop requests error:', error);
    res.status(500).json({ success: false, error: 'server_error' });
  }
});

router.get('/shop-requests/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const request = await ShopRequest.findById(id)
      .populate('userId', 'telegramId username firstName lastName phone')
      .lean();
    
    if (!request) {
      return res.status(404).json({ success: false, error: 'not_found' });
    }
    
    res.json({
      success: true,
      request,
    });
  } catch (error) {
    console.error('[Admin] Get shop request error:', error);
    res.status(500).json({ success: false, error: 'server_error' });
  }
});

router.post('/shop-requests/:id/approve', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const request = await ShopRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({ success: false, error: 'not_found' });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'already_processed' });
    }
    
    const user = await User.findById(request.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'user_not_found' });
    }
    
    // Check if seller profile already exists for this user
    let sellerProfile = await SellerProfile.findOne({ userId: request.userId });
    
    // Map shopType to shopRole
    const shopTypeToRole = {
      farmer: 'FARMER',
      shop: 'SHOP',
      service: 'SHOP',
      blogger: 'BLOGGER',
      artisan: 'ARTISAN',
    };
    const shopRole = request.shopRole || shopTypeToRole[request.shopType] || 'SHOP';
    
    const profileData = {
      telegramId: request.telegramId,
      name: request.name,
      description: request.description,
      isFarmer: request.shopType === 'farmer',
      shopRole: shopRole,
      phone: request.contacts?.phone,
      telegramUsername: request.contacts?.telegram,
      instagram: request.contacts?.instagram,
      address: request.address,
      city: request.city,
      region: request.region,
      geo: request.geo,
      avatar: request.avatar,
      banner: request.banner,
      workingHours: request.workingHours?.customHours || request.workingHours?.preset,
      deliveryInfo: request.deliveryOptions?.hasDelivery 
        ? `Доставка: ${request.deliveryOptions.deliveryZone || 'по городу'}` 
        : null,
      showPhone: true,
      isVerified: true,
      isActive: true,
      tags: request.categories || [],
    };
    
    if (sellerProfile) {
      // Update existing profile
      Object.assign(sellerProfile, profileData);
      await sellerProfile.save();
      console.log(`[Admin] Updated existing seller profile: ${sellerProfile._id}`);
    } else {
      // Create new profile
      const slug = await SellerProfile.generateSlug(request.name);
      sellerProfile = new SellerProfile({
        userId: request.userId,
        slug,
        ...profileData,
      });
      await sellerProfile.save();
      console.log(`[Admin] Created new seller profile: ${sellerProfile._id}`);
    }
    
    user.role = request.shopType === 'farmer' ? 'seller' : 'seller';
    await user.save();
    
    request.status = 'approved';
    request.reviewedBy = req.currentUser._id;
    request.reviewedAt = new Date();
    request.createdSellerProfile = sellerProfile._id;
    await request.save();
    
    console.log(`[Admin] Shop request ${request.name} approved, seller profile created: ${sellerProfile._id}`);
    
    res.json({
      success: true,
      request,
      sellerProfile,
    });
  } catch (error) {
    console.error('[Admin] Approve shop request error:', error);
    res.status(500).json({ success: false, error: 'server_error' });
  }
});

router.post('/shop-requests/:id/reject', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const request = await ShopRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({ success: false, error: 'not_found' });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'already_processed' });
    }
    
    request.status = 'rejected';
    request.rejectReason = reason || 'Заявка отклонена модератором';
    request.reviewedBy = req.currentUser._id;
    request.reviewedAt = new Date();
    await request.save();
    
    console.log(`[Admin] Shop request ${request.name} rejected: ${reason}`);
    
    res.json({
      success: true,
      request,
    });
  } catch (error) {
    console.error('[Admin] Reject shop request error:', error);
    res.status(500).json({ success: false, error: 'server_error' });
  }
});

export default router;
