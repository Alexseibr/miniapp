import mongoose from 'mongoose';

const farmerDemandSchema = new mongoose.Schema(
  {
    regionId: {
      type: String,
      required: true,
      index: true,
    },
    geoHash: {
      type: String,
      index: true,
    },
    citySlug: {
      type: String,
      index: true,
    },
    productKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    searches24h: {
      type: Number,
      default: 0,
      min: 0,
    },
    searches7d: {
      type: Number,
      default: 0,
      min: 0,
    },
    uniqueUsers24h: {
      type: Number,
      default: 0,
      min: 0,
    },
    uniqueUsers7d: {
      type: Number,
      default: 0,
      min: 0,
    },
    trend: {
      type: String,
      enum: ['up', 'down', 'flat'],
      default: 'flat',
      index: true,
    },
    trendPercent: {
      type: Number,
      default: 0,
    },
    previousWeekSearches: {
      type: Number,
      default: 0,
    },
    lastSearchAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

farmerDemandSchema.index({ regionId: 1, productKey: 1 }, { unique: true });
farmerDemandSchema.index({ trend: 1, searches24h: -1 });
farmerDemandSchema.index({ updatedAt: -1 });

farmerDemandSchema.statics.getHighDemandProducts = async function(regionId, options = {}) {
  const { minSearches = 5, limit = 10 } = options;
  
  return this.find({
    regionId,
    searches24h: { $gte: minSearches },
    trend: 'up',
  })
    .sort({ searches24h: -1, trendPercent: -1 })
    .limit(limit)
    .lean();
};

farmerDemandSchema.statics.getTopProductsInRegion = async function(regionId, limit = 10) {
  return this.find({ regionId })
    .sort({ searches24h: -1 })
    .limit(limit)
    .lean();
};

farmerDemandSchema.statics.upsertDemand = async function(regionId, productKey, data) {
  return this.findOneAndUpdate(
    { regionId, productKey },
    {
      $set: {
        ...data,
        regionId,
        productKey,
      },
    },
    { upsert: true, new: true }
  );
};

const FarmerDemand = mongoose.model('FarmerDemand', farmerDemandSchema);

export default FarmerDemand;
