import { Router } from 'express';
import SellerProfile from '../../models/SellerProfile.js';
import SellerReview from '../../models/SellerReview.js';
import { authMiddleware, optionalAuth } from '../../middleware/auth.js';

const router = Router();

router.post('/:sellerId', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    const { sellerId } = req.params;
    const { rating, text, orderId, adId } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'invalid_rating',
        message: 'Рейтинг должен быть от 1 до 5',
      });
    }
    
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
        error: 'self_review',
        message: 'Нельзя оставить отзыв на свой магазин',
      });
    }
    
    const canReview = await SellerReview.canUserReview(user._id, profile._id);
    
    if (!canReview) {
      return res.status(400).json({
        success: false,
        error: 'already_reviewed',
        message: 'Вы уже оставили отзыв на этот магазин',
      });
    }
    
    const review = new SellerReview({
      sellerId: profile._id,
      userId: user._id,
      userTelegramId: user.telegramId,
      rating: parseInt(rating),
      text: text?.trim(),
      orderId,
      adId,
      isVerifiedPurchase: !!orderId,
    });
    
    await review.save();
    
    console.log(`[SellerReview] User ${user.telegramId} reviewed seller ${profile.name} with rating ${rating}`);
    
    res.status(201).json({
      success: true,
      review,
      newRating: profile.ratings,
    });
  } catch (error) {
    console.error('[SellerReview] Create error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
    });
  }
});

router.get('/:sellerId', optionalAuth, async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { page = 1, limit = 10, sort = 'newest' } = req.query;
    
    const profile = await SellerProfile.findBySlugOrId(sellerId);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
      });
    }
    
    const query = {
      sellerId: profile._id,
      isVisible: true,
    };
    
    let sortOption = { createdAt: -1 };
    switch (sort) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'rating_high':
        sortOption = { rating: -1, createdAt: -1 };
        break;
      case 'rating_low':
        sortOption = { rating: 1, createdAt: -1 };
        break;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [reviews, total, stats] = await Promise.all([
      SellerReview.find(query)
        .populate('userId', 'firstName lastName username')
        .sort(sortOption)
        .skip(skip)
        .limit(parseInt(limit)),
      SellerReview.countDocuments(query),
      SellerReview.getSellerStats(profile._id),
    ]);
    
    let userReview = null;
    if (req.currentUser) {
      userReview = await SellerReview.findOne({
        sellerId: profile._id,
        userId: req.currentUser._id,
      });
    }
    
    res.json({
      success: true,
      reviews,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      stats,
      userReview,
      canReview: !userReview && (!req.currentUser || !profile.userId.equals(req.currentUser._id)),
    });
  } catch (error) {
    console.error('[SellerReview] Get reviews error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
    });
  }
});

router.put('/:sellerId/:reviewId', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    const { sellerId, reviewId } = req.params;
    const { rating, text } = req.body;
    
    const review = await SellerReview.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
      });
    }
    
    if (!review.userId.equals(user._id)) {
      return res.status(403).json({
        success: false,
        error: 'forbidden',
      });
    }
    
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: 'invalid_rating',
        });
      }
      review.rating = parseInt(rating);
    }
    
    if (text !== undefined) {
      review.text = text?.trim();
    }
    
    await review.save();
    
    res.json({
      success: true,
      review,
    });
  } catch (error) {
    console.error('[SellerReview] Update error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
    });
  }
});

router.delete('/:sellerId/:reviewId', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    const { reviewId } = req.params;
    
    const review = await SellerReview.findById(reviewId);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
      });
    }
    
    if (!review.userId.equals(user._id) && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'forbidden',
      });
    }
    
    await review.deleteOne();
    
    res.json({
      success: true,
      message: 'Отзыв удален',
    });
  } catch (error) {
    console.error('[SellerReview] Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
    });
  }
});

router.post('/:sellerId/:reviewId/reply', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    const { sellerId, reviewId } = req.params;
    const { text } = req.body;
    
    if (!text?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'empty_reply',
      });
    }
    
    const profile = await SellerProfile.findBySlugOrId(sellerId);
    
    if (!profile || !profile.userId.equals(user._id)) {
      return res.status(403).json({
        success: false,
        error: 'forbidden',
        message: 'Только владелец магазина может отвечать на отзывы',
      });
    }
    
    const review = await SellerReview.findById(reviewId);
    
    if (!review || !review.sellerId.equals(profile._id)) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
      });
    }
    
    review.sellerReply = {
      text: text.trim(),
      createdAt: new Date(),
    };
    
    await review.save();
    
    res.json({
      success: true,
      review,
    });
  } catch (error) {
    console.error('[SellerReview] Reply error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
    });
  }
});

export default router;
