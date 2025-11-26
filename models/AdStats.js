import mongoose from 'mongoose';

const adStatsSchema = new mongoose.Schema({
  adId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ad',
    required: true,
    unique: true,
    index: true,
  },
  
  viewsCount: {
    type: Number,
    default: 0,
  },
  viewsLast24h: {
    type: Number,
    default: 0,
  },
  viewsLast72h: {
    type: Number,
    default: 0,
  },
  
  contactClicks: {
    type: Number,
    default: 0,
  },
  
  favoritesCount: {
    type: Number,
    default: 0,
  },
  
  lastFastMarketScore: {
    type: Number,
    default: 0,
  },
  lastFastMarketScoreAt: {
    type: Date,
    default: null,
  },
  
  viewHistory: [{
    timestamp: { type: Date, default: Date.now },
    userId: String,
  }],
  
  contactHistory: [{
    timestamp: { type: Date, default: Date.now },
    userId: String,
    type: { type: String, enum: ['phone', 'telegram', 'instagram'] },
  }],
}, {
  timestamps: true,
});

adStatsSchema.index({ lastFastMarketScore: -1 });
adStatsSchema.index({ viewsLast72h: -1 });
adStatsSchema.index({ updatedAt: -1 });

adStatsSchema.statics.incrementViews = async function(adId, userId = null) {
  const now = new Date();
  
  return this.findOneAndUpdate(
    { adId },
    {
      $inc: { viewsCount: 1, viewsLast24h: 1, viewsLast72h: 1 },
      $push: {
        viewHistory: {
          $each: [{ timestamp: now, userId }],
          $slice: -1000,
        },
      },
    },
    { upsert: true, new: true }
  );
};

adStatsSchema.statics.incrementContactClicks = async function(adId, userId = null, type = 'telegram') {
  const now = new Date();
  
  return this.findOneAndUpdate(
    { adId },
    {
      $inc: { contactClicks: 1 },
      $push: {
        contactHistory: {
          $each: [{ timestamp: now, userId, type }],
          $slice: -500,
        },
      },
    },
    { upsert: true, new: true }
  );
};

adStatsSchema.statics.incrementFavorites = async function(adId, delta = 1) {
  return this.findOneAndUpdate(
    { adId },
    { $inc: { favoritesCount: delta } },
    { upsert: true, new: true }
  );
};

adStatsSchema.statics.recalculateRecentViews = async function() {
  const now = new Date();
  const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const h72ago = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  
  const stats = await this.find({});
  
  for (const stat of stats) {
    const views24h = stat.viewHistory.filter(v => v.timestamp >= h24ago).length;
    const views72h = stat.viewHistory.filter(v => v.timestamp >= h72ago).length;
    
    await this.updateOne(
      { _id: stat._id },
      { $set: { viewsLast24h: views24h, viewsLast72h: views72h } }
    );
  }
};

const AdStats = mongoose.model('AdStats', adStatsSchema);

export default AdStats;
