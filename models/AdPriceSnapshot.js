import mongoose from 'mongoose';

const adPriceSnapshotSchema = new mongoose.Schema(
  {
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ad',
      required: true,
      unique: true,
      index: true,
    },
    hasMarketData: {
      type: Boolean,
      default: false,
    },
    avgPrice: {
      type: Number,
      default: null,
    },
    minPrice: {
      type: Number,
      default: null,
    },
    maxPrice: {
      type: Number,
      default: null,
    },
    medianPrice: {
      type: Number,
      default: null,
    },
    count: {
      type: Number,
      default: 0,
    },
    diffPercent: {
      type: Number,
      default: null,
    },
    marketLevel: {
      type: String,
      enum: ['below', 'fair', 'above', 'unknown'],
      default: 'unknown',
    },
    windowDays: {
      type: Number,
      default: null,
    },
    avgPricePerSqm: {
      type: Number,
      default: null,
    },
    comparisonType: {
      type: String,
      enum: ['electronics', 'cars', 'realty', 'general'],
      default: 'general',
    },
    adPrice: {
      type: Number,
      default: null,
    },
    adCategoryId: {
      type: String,
      default: null,
    },
    adSubcategoryId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

adPriceSnapshotSchema.index({ updatedAt: 1 });
adPriceSnapshotSchema.index({ marketLevel: 1 });
adPriceSnapshotSchema.index({ hasMarketData: 1 });

adPriceSnapshotSchema.statics.getOrCreate = async function (adId) {
  let snapshot = await this.findOne({ adId });
  if (!snapshot) {
    snapshot = new this({ adId, hasMarketData: false });
    await snapshot.save();
  }
  return snapshot;
};

adPriceSnapshotSchema.statics.updateSnapshot = async function (adId, data) {
  return this.findOneAndUpdate(
    { adId },
    {
      $set: {
        ...data,
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );
};

adPriceSnapshotSchema.statics.getStaleSnapshots = async function (maxAgeHours = 24, limit = 100) {
  const threshold = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  return this.find({
    $or: [
      { updatedAt: { $lt: threshold } },
      { updatedAt: { $exists: false } },
    ],
  })
    .limit(limit)
    .select('adId');
};

adPriceSnapshotSchema.statics.getBriefForAds = async function (adIds) {
  if (!Array.isArray(adIds) || adIds.length === 0) {
    return [];
  }
  return this.find({ adId: { $in: adIds } }).select(
    'adId hasMarketData diffPercent marketLevel avgPrice'
  );
};

export default mongoose.model('AdPriceSnapshot', adPriceSnapshotSchema);
