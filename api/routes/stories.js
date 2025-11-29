import { Router } from 'express';
import Story from '../../models/Story.js';
import SellerProfile from '../../models/SellerProfile.js';
import Ad from '../../models/Ad.js';
import { authMiddleware, optionalAuth } from '../../middleware/auth.js';

const router = Router();

const STORY_DURATION_HOURS = 24;

router.get('/feed', optionalAuth, async (req, res) => {
  try {
    const { limit = 20, skip = 0 } = req.query;
    
    const stories = await Story.getActiveStories({
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
    
    const userId = req.currentUser?._id;
    const telegramId = req.currentUser?.telegramId;
    
    let storiesWithViewStatus = stories;
    if (userId || telegramId) {
      const viewedMap = new Map();
      
      for (const story of stories) {
        const isViewed = await Story.hasUserViewedStory(story._id, userId, telegramId);
        viewedMap.set(story._id.toString(), isViewed);
      }
      
      storiesWithViewStatus = stories.map(story => ({
        ...story,
        isViewed: viewedMap.get(story._id.toString()) || false,
      }));
      
      storiesWithViewStatus.sort((a, b) => {
        if (a.isViewed === b.isViewed) {
          return new Date(b.publishedAt) - new Date(a.publishedAt);
        }
        return a.isViewed ? 1 : -1;
      });
    }
    
    return res.json({
      success: true,
      stories: storiesWithViewStatus,
      total: storiesWithViewStatus.length,
    });
  } catch (error) {
    console.error('[Stories] Feed error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch stories' });
  }
});

router.get('/seller/:sellerId', optionalAuth, async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { includeExpired = false } = req.query;
    
    const profile = await SellerProfile.findOne({
      $or: [
        { _id: sellerId },
        { slug: sellerId },
        { telegramId: parseInt(sellerId) || 0 },
      ],
    });
    
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Seller not found' });
    }
    
    const stories = await Story.getSellerStories(profile._id, {
      includeExpired: includeExpired === 'true',
    });
    
    return res.json({
      success: true,
      seller: {
        _id: profile._id,
        name: profile.name,
        avatar: profile.avatar,
        slug: profile.slug,
        shopRole: profile.shopRole,
      },
      stories,
    });
  } catch (error) {
    console.error('[Stories] Seller stories error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch seller stories' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate('sellerId', 'name avatar slug shopRole')
      .populate('linkedAdId', 'title price currency photos previewUrl')
      .lean();
    
    if (!story) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }
    
    return res.json({
      success: true,
      story,
    });
  } catch (error) {
    console.error('[Stories] Get story error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch story' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    
    const profile = await SellerProfile.findOne({ userId: user._id });
    if (!profile) {
      return res.status(403).json({
        success: false,
        error: 'seller_required',
        message: 'Только продавцы могут создавать истории',
      });
    }
    
    const { items, linkedAdId, caption } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'items_required',
        message: 'Добавьте хотя бы одно фото или видео',
      });
    }
    
    if (items.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'too_many_items',
        message: 'Максимум 10 элементов в истории',
      });
    }
    
    const validatedItems = items.map(item => ({
      type: item.type === 'video' ? 'video' : 'image',
      mediaUrl: item.mediaUrl,
      thumbnailUrl: item.thumbnailUrl || null,
      duration: Math.min(Math.max(item.duration || 5000, 1000), 15000),
      aspectRatio: item.aspectRatio || 0.5625,
    }));
    
    if (linkedAdId) {
      const ad = await Ad.findOne({ 
        _id: linkedAdId, 
        sellerTelegramId: user.telegramId,
        status: 'active',
      });
      
      if (!ad) {
        return res.status(400).json({
          success: false,
          error: 'invalid_ad',
          message: 'Объявление не найдено или недоступно',
        });
      }
    }
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + STORY_DURATION_HOURS);
    
    const story = new Story({
      sellerId: profile._id,
      sellerTelegramId: user.telegramId,
      items: validatedItems,
      linkedAdId: linkedAdId || null,
      caption: caption?.trim()?.slice(0, 200) || null,
      expiresAt,
      publishedAt: new Date(),
    });
    
    await story.save();
    
    console.log(`[Stories] Created story ${story._id} by seller ${profile.name}`);
    
    return res.status(201).json({
      success: true,
      story: {
        _id: story._id,
        items: story.items,
        linkedAdId: story.linkedAdId,
        caption: story.caption,
        expiresAt: story.expiresAt,
        publishedAt: story.publishedAt,
      },
    });
  } catch (error) {
    console.error('[Stories] Create error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create story' });
  }
});

router.post('/:id/view', optionalAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }
    
    if (story.status !== 'active' || story.expiresAt < new Date()) {
      return res.status(410).json({ success: false, error: 'Story expired' });
    }
    
    const userId = req.currentUser?._id || null;
    const telegramId = req.currentUser?.telegramId || req.body.telegramId || null;
    const { completed = false, clickedProduct = false } = req.body;
    
    const stats = await story.recordView(userId, telegramId, completed, clickedProduct);
    
    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[Stories] View error:', error);
    return res.status(500).json({ success: false, error: 'Failed to record view' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).json({ success: false, error: 'Story not found' });
    }
    
    if (story.sellerTelegramId !== user.telegramId && user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    story.status = 'deleted';
    await story.save();
    
    console.log(`[Stories] Deleted story ${story._id} by user ${user.telegramId}`);
    
    return res.json({ success: true });
  } catch (error) {
    console.error('[Stories] Delete error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete story' });
  }
});

router.get('/my/list', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    
    const profile = await SellerProfile.findOne({ userId: user._id });
    if (!profile) {
      return res.json({ success: true, stories: [] });
    }
    
    const { includeExpired = true } = req.query;
    
    const stories = await Story.getSellerStories(profile._id, {
      includeExpired: includeExpired !== 'false',
      limit: 50,
    });
    
    return res.json({
      success: true,
      stories,
    });
  } catch (error) {
    console.error('[Stories] My list error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch stories' });
  }
});

router.get('/my/analytics', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    
    const profile = await SellerProfile.findOne({ userId: user._id });
    if (!profile) {
      return res.status(403).json({
        success: false,
        error: 'seller_required',
        message: 'Профиль продавца не найден',
      });
    }
    
    const { days = 7 } = req.query;
    
    const analytics = await Story.getSellerAnalytics(profile._id, parseInt(days));
    
    return res.json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error('[Stories] Analytics error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

export default router;
