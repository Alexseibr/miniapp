import mongoose from 'mongoose';

const storyItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    duration: {
      type: Number,
      default: 5000,
      min: 1000,
      max: 15000,
    },
    aspectRatio: {
      type: Number,
      default: 0.5625,
    },
  },
  { _id: true }
);

const storyViewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    telegramId: {
      type: Number,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    clickedProduct: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const storySchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SellerProfile',
      required: true,
      index: true,
    },
    sellerTelegramId: {
      type: Number,
      required: true,
      index: true,
    },
    items: {
      type: [storyItemSchema],
      validate: {
        validator: function(v) {
          return v.length > 0 && v.length <= 10;
        },
        message: 'Story must have 1-10 items',
      },
    },
    linkedAdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ad',
      default: null,
      index: true,
    },
    caption: {
      type: String,
      maxlength: 200,
      default: null,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'expired', 'deleted'],
      default: 'active',
      index: true,
    },
    views: {
      type: [storyViewSchema],
      default: [],
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    uniqueViewCount: {
      type: Number,
      default: 0,
    },
    productClickCount: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

storySchema.index({ status: 1, expiresAt: 1 });
storySchema.index({ sellerId: 1, status: 1, createdAt: -1 });
storySchema.index({ status: 1, publishedAt: -1 });
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

storySchema.statics.getActiveStories = async function(options = {}) {
  const { limit = 50, skip = 0 } = options;
  
  const now = new Date();
  
  return this.aggregate([
    {
      $match: {
        status: 'active',
        expiresAt: { $gt: now },
      },
    },
    {
      $sort: { publishedAt: -1 },
    },
    {
      $group: {
        _id: '$sellerId',
        latestStory: { $first: '$$ROOT' },
        storyCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'sellerprofiles',
        localField: '_id',
        foreignField: '_id',
        as: 'seller',
      },
    },
    {
      $unwind: '$seller',
    },
    {
      $project: {
        _id: '$latestStory._id',
        sellerId: '$_id',
        sellerName: '$seller.name',
        sellerAvatar: '$seller.avatar',
        sellerSlug: '$seller.slug',
        shopRole: '$seller.shopRole',
        items: '$latestStory.items',
        linkedAdId: '$latestStory.linkedAdId',
        caption: '$latestStory.caption',
        viewCount: '$latestStory.viewCount',
        publishedAt: '$latestStory.publishedAt',
        expiresAt: '$latestStory.expiresAt',
        storyCount: 1,
      },
    },
    {
      $sort: { publishedAt: -1 },
    },
    { $skip: skip },
    { $limit: limit },
  ]);
};

storySchema.statics.getSellerStories = async function(sellerId, options = {}) {
  const { includeExpired = false, limit = 20 } = options;
  
  const query = { sellerId };
  
  if (!includeExpired) {
    query.status = 'active';
    query.expiresAt = { $gt: new Date() };
  }
  
  return this.find(query)
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean();
};

storySchema.methods.recordView = async function(userId, telegramId, completed = false, clickedProduct = false) {
  const existingView = this.views.find(
    v => (userId && v.userId?.equals(userId)) || (telegramId && v.telegramId === telegramId)
  );
  
  if (existingView) {
    if (completed && !existingView.completed) {
      existingView.completed = true;
    }
    if (clickedProduct && !existingView.clickedProduct) {
      existingView.clickedProduct = true;
      this.productClickCount += 1;
    }
    existingView.viewedAt = new Date();
  } else {
    this.views.push({
      userId,
      telegramId,
      viewedAt: new Date(),
      completed,
      clickedProduct,
    });
    this.uniqueViewCount += 1;
    if (clickedProduct) {
      this.productClickCount += 1;
    }
  }
  
  this.viewCount += 1;
  
  await this.save();
  
  return {
    viewCount: this.viewCount,
    uniqueViewCount: this.uniqueViewCount,
    productClickCount: this.productClickCount,
  };
};

storySchema.statics.hasUserViewedStory = async function(storyId, userId, telegramId) {
  const story = await this.findById(storyId).select('views').lean();
  if (!story) return false;
  
  return story.views.some(
    v => (userId && v.userId?.toString() === userId.toString()) || 
         (telegramId && v.telegramId === telegramId)
  );
};

storySchema.statics.getSellerAnalytics = async function(sellerId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const stories = await this.find({
    sellerId,
    createdAt: { $gte: startDate },
  }).lean();
  
  const totalStories = stories.length;
  const totalViews = stories.reduce((sum, s) => sum + s.viewCount, 0);
  const uniqueViews = stories.reduce((sum, s) => sum + s.uniqueViewCount, 0);
  const productClicks = stories.reduce((sum, s) => sum + s.productClickCount, 0);
  
  const avgViewsPerStory = totalStories > 0 ? Math.round(totalViews / totalStories) : 0;
  const clickThroughRate = uniqueViews > 0 ? Math.round((productClicks / uniqueViews) * 100) : 0;
  
  return {
    period: days,
    totalStories,
    totalViews,
    uniqueViews,
    productClicks,
    avgViewsPerStory,
    clickThroughRate,
    stories: stories.map(s => ({
      _id: s._id,
      caption: s.caption,
      viewCount: s.viewCount,
      uniqueViewCount: s.uniqueViewCount,
      productClickCount: s.productClickCount,
      publishedAt: s.publishedAt,
      expiresAt: s.expiresAt,
      status: s.status,
    })),
  };
};

export default mongoose.model('Story', storySchema);
