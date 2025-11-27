import mongoose from 'mongoose';

const storeDailyStatsSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SellerProfile',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    favorites: {
      type: Number,
      default: 0,
    },
    unfavorites: {
      type: Number,
      default: 0,
    },
    contactClicks: {
      type: Number,
      default: 0,
    },
    telegramOpens: {
      type: Number,
      default: 0,
    },
    callClicks: {
      type: Number,
      default: 0,
    },
    messagesSent: {
      type: Number,
      default: 0,
    },
    shares: {
      type: Number,
      default: 0,
    },
    searchHits: {
      type: Number,
      default: 0,
    },
    ordersStarted: {
      type: Number,
      default: 0,
    },
    ordersFinished: {
      type: Number,
      default: 0,
    },
    uniqueVisitors: {
      type: Number,
      default: 0,
    },
    byCategory: [{
      categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
      categoryName: String,
      views: { type: Number, default: 0 },
      favorites: { type: Number, default: 0 },
      contactClicks: { type: Number, default: 0 },
    }],
    bySource: {
      organic: { type: Number, default: 0 },
      boost: { type: Number, default: 0 },
      banner: { type: Number, default: 0 },
      campaign: { type: Number, default: 0 },
    },
    topAds: [{
      adId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ad',
      },
      title: String,
      views: { type: Number, default: 0 },
      contactClicks: { type: Number, default: 0 },
    }],
  },
  {
    timestamps: true,
  }
);

storeDailyStatsSchema.index({ storeId: 1, date: 1 }, { unique: true });
storeDailyStatsSchema.index({ date: -1 });

storeDailyStatsSchema.statics.getOrCreate = async function(storeId, date) {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  
  let stats = await this.findOne({ storeId, date: dayStart });
  
  if (!stats) {
    stats = new this({
      storeId,
      date: dayStart,
    });
    await stats.save();
  }
  
  return stats;
};

storeDailyStatsSchema.statics.incrementMetric = async function(storeId, metric, value = 1) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  const update = { $inc: { [metric]: value } };
  
  await this.findOneAndUpdate(
    { storeId, date: today },
    update,
    { upsert: true, new: true }
  );
};

storeDailyStatsSchema.statics.getStatsForPeriod = async function(storeId, startDate, endDate) {
  return this.find({
    storeId,
    date: { $gte: startDate, $lte: endDate },
  })
    .sort({ date: 1 })
    .lean();
};

storeDailyStatsSchema.statics.getAggregatedStats = async function(storeId, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        storeId: new mongoose.Types.ObjectId(storeId),
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalViews: { $sum: '$views' },
        totalFavorites: { $sum: '$favorites' },
        totalContactClicks: { $sum: '$contactClicks' },
        totalTelegramOpens: { $sum: '$telegramOpens' },
        totalCallClicks: { $sum: '$callClicks' },
        totalMessagesSent: { $sum: '$messagesSent' },
        totalShares: { $sum: '$shares' },
        totalSearchHits: { $sum: '$searchHits' },
        totalOrdersStarted: { $sum: '$ordersStarted' },
        totalOrdersFinished: { $sum: '$ordersFinished' },
        totalUniqueVisitors: { $sum: '$uniqueVisitors' },
        daysCount: { $sum: 1 },
      },
    },
  ]);
  
  return result[0] || {
    totalViews: 0,
    totalFavorites: 0,
    totalContactClicks: 0,
    totalTelegramOpens: 0,
    totalCallClicks: 0,
    totalMessagesSent: 0,
    totalShares: 0,
    totalSearchHits: 0,
    totalOrdersStarted: 0,
    totalOrdersFinished: 0,
    totalUniqueVisitors: 0,
    daysCount: 0,
  };
};

export default mongoose.model('StoreDailyStats', storeDailyStatsSchema);
