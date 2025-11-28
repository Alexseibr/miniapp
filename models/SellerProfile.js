import mongoose from 'mongoose';

const GeoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      index: '2dsphere',
    },
  },
  { _id: false }
);

const RatingsSchema = new mongoose.Schema(
  {
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const AnalyticsSchema = new mongoose.Schema(
  {
    totalViews: {
      type: Number,
      default: 0,
    },
    totalProductViews: {
      type: Number,
      default: 0,
    },
    contactOpens: {
      type: Number,
      default: 0,
    },
    lastViewedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const sellerProfileSchema = new mongoose.Schema(
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
      required: true,
      unique: true,
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    avatar: {
      type: String,
      trim: true,
      default: null,
    },
    banner: {
      type: String,
      trim: true,
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    isFarmer: {
      type: Boolean,
      default: false,
      index: true,
    },
    instagram: {
      type: String,
      trim: true,
      default: null,
    },
    telegramUsername: {
      type: String,
      trim: true,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    geo: {
      type: GeoPointSchema,
      default: null,
    },
    city: {
      type: String,
      trim: true,
      default: null,
    },
    cityCode: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      default: null,
    },
    ratings: {
      type: RatingsSchema,
      default: () => ({ score: 0, count: 0 }),
    },
    subscribersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    productsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    analytics: {
      type: AnalyticsSchema,
      default: () => ({}),
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    blockReason: {
      type: String,
      trim: true,
      default: null,
    },
    workingHours: {
      type: String,
      trim: true,
      default: null,
    },
    deliveryInfo: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    showPhone: {
      type: Boolean,
      default: true,
    },
    region: {
      type: String,
      trim: true,
      default: null,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    baseLocation: {
      lat: { type: Number },
      lng: { type: Number },
      address: { type: String, trim: true, default: null },
    },
  },
  {
    timestamps: true,
  }
);

sellerProfileSchema.index({ name: 'text', description: 'text' });
sellerProfileSchema.index({ 'geo': '2dsphere' });
sellerProfileSchema.index({ subscribersCount: -1 });
sellerProfileSchema.index({ 'ratings.score': -1 });
sellerProfileSchema.index({ createdAt: -1 });

sellerProfileSchema.statics.generateSlug = async function(name) {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s]/gi, '')
    .replace(/\s+/g, '-')
    .substring(0, 30);
  
  let slug = baseSlug;
  let counter = 1;
  
  while (await this.findOne({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug || `shop-${Date.now().toString(36)}`;
};

sellerProfileSchema.statics.findBySlugOrId = async function(identifier) {
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    return this.findById(identifier);
  }
  return this.findOne({ slug: identifier.toLowerCase() });
};

sellerProfileSchema.methods.incrementView = async function() {
  this.analytics.totalViews = (this.analytics.totalViews || 0) + 1;
  this.analytics.lastViewedAt = new Date();
  return this.save();
};

sellerProfileSchema.methods.incrementContactOpen = async function() {
  this.analytics.contactOpens = (this.analytics.contactOpens || 0) + 1;
  return this.save();
};

sellerProfileSchema.methods.updateProductsCount = async function() {
  const Ad = mongoose.model('Ad');
  const count = await Ad.countDocuments({
    sellerTelegramId: this.telegramId,
    status: 'active',
  });
  this.productsCount = count;
  return this.save();
};

sellerProfileSchema.methods.updateRating = async function() {
  const Review = mongoose.model('SellerReview');
  const stats = await Review.aggregate([
    { $match: { sellerId: this._id } },
    {
      $group: {
        _id: null,
        avgScore: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);
  
  if (stats.length > 0) {
    this.ratings.score = Math.round(stats[0].avgScore * 10) / 10;
    this.ratings.count = stats[0].count;
  } else {
    this.ratings.score = 0;
    this.ratings.count = 0;
  }
  
  return this.save();
};

const SellerProfile = mongoose.model('SellerProfile', sellerProfileSchema);

export default SellerProfile;
