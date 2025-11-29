import mongoose from 'mongoose';

const InterestSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    query: { type: String, trim: true },
    tags: [{ type: String }],
    weight: { type: Number, default: 1 },
    lastUpdatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const WatchItemSchema = new mongoose.Schema(
  {
    createdAt: { type: Date, default: Date.now },
    title: { type: String, required: true, trim: true },
    query: { type: String, trim: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    tags: [{ type: String }],
    maxPrice: { type: Number },
    minPrice: { type: Number },
    radiusKm: { type: Number, default: 10 },
    onlyNearby: { type: Boolean, default: false },
    notifyOnNew: { type: Boolean, default: true },
    notifyOnPriceDrop: { type: Boolean, default: true },
    notifyOnFirstMatch: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastNotifiedAt: { type: Date },
    matchCount: { type: Number, default: 0 },
  },
  { _id: true }
);

const HistoryEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['search', 'view', 'favorite', 'contact_click', 'purchase'],
      required: true,
    },
    query: { type: String },
    adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad' },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const FavoriteLocationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    label: { type: String, trim: true },
  },
  { _id: false }
);

const PreferencesSchema = new mongoose.Schema(
  {
    maxRadiusKmDefault: { type: Number, default: 10 },
    favoriteLocations: [FavoriteLocationSchema],
    priceSensitivity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    notificationsEnabled: { type: Boolean, default: true },
    quietHoursStart: { type: Number },
    quietHoursEnd: { type: Number },
  },
  { _id: false }
);

const RecommendationSchema = new mongoose.Schema(
  {
    adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad' },
    watchItemId: { type: mongoose.Schema.Types.ObjectId },
    type: {
      type: String,
      enum: ['new_match', 'price_drop', 'nearby', 'trending', 'similar'],
    },
    message: { type: String },
    createdAt: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false },
    isSent: { type: Boolean, default: false },
  },
  { _id: true }
);

const userTwinSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    telegramId: {
      type: Number,
      index: true,
    },
    interests: {
      type: [InterestSchema],
      default: [],
    },
    watchItems: {
      type: [WatchItemSchema],
      default: [],
    },
    history: {
      type: [HistoryEventSchema],
      default: [],
    },
    preferences: {
      type: PreferencesSchema,
      default: () => ({}),
    },
    recommendations: {
      type: [RecommendationSchema],
      default: [],
    },
    aiSummary: {
      type: String,
    },
    aiSummaryUpdatedAt: {
      type: Date,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

userTwinSchema.index({ 'watchItems.isActive': 1, 'watchItems.categoryId': 1 });
userTwinSchema.index({ 'interests.categoryId': 1, 'interests.weight': -1 });
userTwinSchema.index({ 'recommendations.isRead': 1, 'recommendations.createdAt': -1 });

userTwinSchema.statics.getOrCreate = async function (userId, telegramId = null) {
  let twin = await this.findOne({ userId });
  if (!twin) {
    twin = await this.create({ userId, telegramId });
  } else if (telegramId && !twin.telegramId) {
    twin.telegramId = telegramId;
    await twin.save();
  }
  return twin;
};

userTwinSchema.statics.findByTelegramId = function (telegramId) {
  return this.findOne({ telegramId });
};

userTwinSchema.methods.addInterest = function (categoryId, query, tags = [], weightBoost = 1) {
  const existing = this.interests.find(
    (i) =>
      (categoryId && i.categoryId?.toString() === categoryId.toString()) ||
      (query && i.query?.toLowerCase() === query?.toLowerCase())
  );

  if (existing) {
    existing.weight = Math.min(existing.weight + weightBoost, 100);
    existing.lastUpdatedAt = new Date();
    if (tags.length > 0) {
      existing.tags = [...new Set([...(existing.tags || []), ...tags])];
    }
  } else {
    this.interests.push({
      categoryId,
      query,
      tags,
      weight: weightBoost,
      lastUpdatedAt: new Date(),
    });
  }

  this.interests.sort((a, b) => b.weight - a.weight);
  if (this.interests.length > 50) {
    this.interests = this.interests.slice(0, 50);
  }
};

userTwinSchema.methods.addHistoryEvent = function (type, data = {}) {
  this.history.unshift({
    type,
    query: data.query,
    adId: data.adId,
    categoryId: data.categoryId,
    createdAt: new Date(),
  });

  if (this.history.length > 200) {
    this.history = this.history.slice(0, 200);
  }

  this.lastActiveAt = new Date();
};

userTwinSchema.methods.getActiveWatchItems = function () {
  return this.watchItems.filter((w) => w.isActive);
};

userTwinSchema.methods.addRecommendation = function (adId, type, message, watchItemId = null) {
  const existingIndex = this.recommendations.findIndex(
    (r) => r.adId?.toString() === adId.toString() && r.type === type
  );

  if (existingIndex >= 0) {
    this.recommendations[existingIndex].createdAt = new Date();
    this.recommendations[existingIndex].isRead = false;
    this.recommendations[existingIndex].message = message;
  } else {
    this.recommendations.unshift({
      adId,
      watchItemId,
      type,
      message,
      createdAt: new Date(),
      isRead: false,
      isSent: false,
    });
  }

  if (this.recommendations.length > 100) {
    this.recommendations = this.recommendations.slice(0, 100);
  }
};

userTwinSchema.methods.getUnreadRecommendations = function () {
  return this.recommendations.filter((r) => !r.isRead);
};

userTwinSchema.methods.markRecommendationsRead = function (ids = null) {
  if (ids) {
    this.recommendations.forEach((r) => {
      if (ids.includes(r._id.toString())) {
        r.isRead = true;
      }
    });
  } else {
    this.recommendations.forEach((r) => {
      r.isRead = true;
    });
  }
};

const UserTwin = mongoose.model('UserTwin', userTwinSchema);

export default UserTwin;
