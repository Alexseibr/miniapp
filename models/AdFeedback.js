import mongoose from 'mongoose';

const REASON_CODES = ['no_response', 'wrong_price', 'wrong_description', 'fake', 'rude', 'other'];

const adFeedbackSchema = new mongoose.Schema(
  {
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ad',
      required: true,
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerTelegramId: {
      type: Number,
      required: true,
      index: true,
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    buyerTelegramId: {
      type: Number,
      default: null,
      index: true,
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ContactEvent',
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    reasonCode: {
      type: String,
      enum: REASON_CODES,
      default: null,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
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
  },
  {
    timestamps: true,
  }
);

adFeedbackSchema.index({ adId: 1, buyerId: 1 }, { unique: true, sparse: true });
adFeedbackSchema.index({ adId: 1, buyerTelegramId: 1 }, { unique: true, sparse: true });
adFeedbackSchema.index({ sellerId: 1, createdAt: -1 });
adFeedbackSchema.index({ sellerId: 1, score: 1 });
adFeedbackSchema.index({ sellerId: 1, reasonCode: 1 });
adFeedbackSchema.index({ createdAt: -1 });
adFeedbackSchema.index({ reasonCode: 1, createdAt: -1 });

adFeedbackSchema.statics.REASON_CODES = REASON_CODES;

adFeedbackSchema.statics.REASON_LABELS = {
  no_response: 'No Response',
  wrong_price: 'Wrong Price',
  wrong_description: 'Wrong Description',
  fake: 'Fake Ad',
  rude: 'Rude Seller',
  other: 'Other',
};

adFeedbackSchema.statics.getAdStats = async function(adId) {
  const stats = await this.aggregate([
    { $match: { adId: new mongoose.Types.ObjectId(adId), isVisible: true } },
    {
      $group: {
        _id: null,
        avgScore: { $avg: '$score' },
        totalVotes: { $sum: 1 },
        score5: { $sum: { $cond: [{ $eq: ['$score', 5] }, 1, 0] } },
        score4: { $sum: { $cond: [{ $eq: ['$score', 4] }, 1, 0] } },
        score3: { $sum: { $cond: [{ $eq: ['$score', 3] }, 1, 0] } },
        score2: { $sum: { $cond: [{ $eq: ['$score', 2] }, 1, 0] } },
        score1: { $sum: { $cond: [{ $eq: ['$score', 1] }, 1, 0] } },
        fakeCount: { $sum: { $cond: [{ $eq: ['$reasonCode', 'fake'] }, 1, 0] } },
        noResponseCount: { $sum: { $cond: [{ $eq: ['$reasonCode', 'no_response'] }, 1, 0] } },
        wrongPriceCount: { $sum: { $cond: [{ $eq: ['$reasonCode', 'wrong_price'] }, 1, 0] } },
        wrongDescCount: { $sum: { $cond: [{ $eq: ['$reasonCode', 'wrong_description'] }, 1, 0] } },
        rudeCount: { $sum: { $cond: [{ $eq: ['$reasonCode', 'rude'] }, 1, 0] } },
      },
    },
  ]);
  
  if (stats.length === 0) {
    return {
      avgScore: 0,
      totalVotes: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      reasons: { fake: 0, no_response: 0, wrong_price: 0, wrong_description: 0, rude: 0 },
    };
  }
  
  return {
    avgScore: Math.round(stats[0].avgScore * 10) / 10,
    totalVotes: stats[0].totalVotes,
    distribution: {
      5: stats[0].score5,
      4: stats[0].score4,
      3: stats[0].score3,
      2: stats[0].score2,
      1: stats[0].score1,
    },
    reasons: {
      fake: stats[0].fakeCount,
      no_response: stats[0].noResponseCount,
      wrong_price: stats[0].wrongPriceCount,
      wrong_description: stats[0].wrongDescCount,
      rude: stats[0].rudeCount,
    },
  };
};

adFeedbackSchema.statics.getSellerStats = async function(sellerId) {
  const stats = await this.aggregate([
    { $match: { sellerId: new mongoose.Types.ObjectId(sellerId), isVisible: true } },
    {
      $group: {
        _id: null,
        avgScore: { $avg: '$score' },
        totalVotes: { $sum: 1 },
        lowScoreCount: { $sum: { $cond: [{ $lte: ['$score', 2] }, 1, 0] } },
        fraudFlags: { $sum: { $cond: [{ $eq: ['$reasonCode', 'fake'] }, 1, 0] } },
        noResponseCount: { $sum: { $cond: [{ $eq: ['$reasonCode', 'no_response'] }, 1, 0] } },
        wrongPriceCount: { $sum: { $cond: [{ $eq: ['$reasonCode', 'wrong_price'] }, 1, 0] } },
        wrongDescCount: { $sum: { $cond: [{ $eq: ['$reasonCode', 'wrong_description'] }, 1, 0] } },
      },
    },
  ]);
  
  if (stats.length === 0) {
    return {
      avgScore: 0,
      totalVotes: 0,
      lowScoreCount: 0,
      fraudFlags: 0,
      reasons: { fake: 0, no_response: 0, wrong_price: 0, wrong_description: 0 },
    };
  }
  
  return {
    avgScore: Math.round(stats[0].avgScore * 10) / 10,
    totalVotes: stats[0].totalVotes,
    lowScoreCount: stats[0].lowScoreCount,
    fraudFlags: stats[0].fraudFlags,
    reasons: {
      fake: stats[0].fraudFlags,
      no_response: stats[0].noResponseCount,
      wrong_price: stats[0].wrongPriceCount,
      wrong_description: stats[0].wrongDescCount,
    },
  };
};

adFeedbackSchema.statics.getRecentFraudReports = async function(days = 30, limit = 100) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        reasonCode: 'fake',
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$sellerId',
        fraudCount: { $sum: 1 },
        lastReportAt: { $max: '$createdAt' },
        ads: { $addToSet: '$adId' },
      },
    },
    {
      $sort: { fraudCount: -1 },
    },
    {
      $limit: limit,
    },
  ]);
};

adFeedbackSchema.statics.getSuspiciousAds = async function(limit = 50) {
  return this.aggregate([
    { $match: { isVisible: true } },
    {
      $group: {
        _id: '$adId',
        avgScore: { $avg: '$score' },
        totalVotes: { $sum: 1 },
        fraudFlags: { $sum: { $cond: [{ $eq: ['$reasonCode', 'fake'] }, 1, 0] } },
        lowScoreCount: { $sum: { $cond: [{ $lte: ['$score', 2] }, 1, 0] } },
        topReason: { $first: '$reasonCode' },
      },
    },
    {
      $match: {
        $or: [
          { avgScore: { $lte: 2.5 }, totalVotes: { $gte: 3 } },
          { fraudFlags: { $gte: 2 } },
        ],
      },
    },
    {
      $sort: { avgScore: 1, fraudFlags: -1 },
    },
    {
      $limit: limit,
    },
  ]);
};

adFeedbackSchema.statics.getSuspiciousSellers = async function(limit = 50) {
  return this.aggregate([
    { $match: { isVisible: true } },
    {
      $group: {
        _id: '$sellerId',
        avgScore: { $avg: '$score' },
        totalVotes: { $sum: 1 },
        fraudFlags: { $sum: { $cond: [{ $eq: ['$reasonCode', 'fake'] }, 1, 0] } },
        lowScoreCount: { $sum: { $cond: [{ $lte: ['$score', 2] }, 1, 0] } },
        uniqueAds: { $addToSet: '$adId' },
        lastFeedbackAt: { $max: '$createdAt' },
      },
    },
    {
      $addFields: {
        adsCount: { $size: '$uniqueAds' },
      },
    },
    {
      $match: {
        $or: [
          { avgScore: { $lte: 2.5 }, totalVotes: { $gte: 5 } },
          { fraudFlags: { $gte: 3 } },
          { lowScoreCount: { $gte: 5 } },
        ],
      },
    },
    {
      $sort: { avgScore: 1, fraudFlags: -1 },
    },
    {
      $limit: limit,
    },
  ]);
};

adFeedbackSchema.statics.canSubmitFeedback = async function(adId, buyerId, buyerTelegramId) {
  const query = { adId };
  
  if (buyerId) {
    query.buyerId = buyerId;
  } else if (buyerTelegramId) {
    query.buyerTelegramId = buyerTelegramId;
  } else {
    return false;
  }
  
  const existing = await this.findOne(query);
  return !existing;
};

const AdFeedback = mongoose.model('AdFeedback', adFeedbackSchema);

export default AdFeedback;
