import mongoose from 'mongoose';

const sellerReviewSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SellerProfile',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userTelegramId: {
      type: Number,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ad',
      default: null,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },
    isModerated: {
      type: Boolean,
      default: false,
    },
    moderatedAt: {
      type: Date,
      default: null,
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sellerReply: {
      text: {
        type: String,
        trim: true,
        maxlength: 500,
      },
      createdAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  }
);

sellerReviewSchema.index({ sellerId: 1, createdAt: -1 });
sellerReviewSchema.index({ userId: 1, sellerId: 1 }, { unique: true });
sellerReviewSchema.index({ sellerId: 1, rating: -1 });
sellerReviewSchema.index({ sellerId: 1, isVisible: 1, createdAt: -1 });

sellerReviewSchema.statics.getSellerStats = async function(sellerId) {
  const stats = await this.aggregate([
    { $match: { sellerId: new mongoose.Types.ObjectId(sellerId), isVisible: true } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
      },
    },
  ]);
  
  if (stats.length === 0) {
    return {
      avgRating: 0,
      totalReviews: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  }
  
  return {
    avgRating: Math.round(stats[0].avgRating * 10) / 10,
    totalReviews: stats[0].totalReviews,
    distribution: {
      5: stats[0].rating5,
      4: stats[0].rating4,
      3: stats[0].rating3,
      2: stats[0].rating2,
      1: stats[0].rating1,
    },
  };
};

sellerReviewSchema.statics.canUserReview = async function(userId, sellerId) {
  const existingReview = await this.findOne({ userId, sellerId });
  return !existingReview;
};

sellerReviewSchema.post('save', async function() {
  try {
    const SellerProfile = mongoose.model('SellerProfile');
    const seller = await SellerProfile.findById(this.sellerId);
    if (seller) {
      await seller.updateRating();
    }
  } catch (error) {
    console.error('[SellerReview] Error updating seller rating:', error);
  }
});

sellerReviewSchema.post('remove', async function() {
  try {
    const SellerProfile = mongoose.model('SellerProfile');
    const seller = await SellerProfile.findById(this.sellerId);
    if (seller) {
      await seller.updateRating();
    }
  } catch (error) {
    console.error('[SellerReview] Error updating seller rating after remove:', error);
  }
});

const SellerReview = mongoose.model('SellerReview', sellerReviewSchema);

export default SellerReview;
