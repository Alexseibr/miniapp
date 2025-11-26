import mongoose from 'mongoose';

const farmerSuggestionSchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    farmerTelegramId: {
      type: Number,
      required: true,
      index: true,
    },
    regionId: {
      type: String,
      required: true,
      index: true,
    },
    productKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    demandInfo: {
      searches24h: { type: Number, default: 0 },
      trend: { type: String, enum: ['up', 'down', 'flat'], default: 'up' },
      trendPercent: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'clicked', 'dismissed', 'expired'],
      default: 'pending',
      index: true,
    },
    sentAt: {
      type: Date,
    },
    clickedAt: {
      type: Date,
    },
    telegramMessageId: {
      type: Number,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

farmerSuggestionSchema.index({ farmerTelegramId: 1, productKey: 1, createdAt: -1 });
farmerSuggestionSchema.index({ status: 1, createdAt: -1 });
farmerSuggestionSchema.index({ regionId: 1, productKey: 1 });

farmerSuggestionSchema.statics.hasRecentSuggestion = async function(
  farmerTelegramId,
  productKey,
  days = 3
) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  const existing = await this.findOne({
    farmerTelegramId,
    productKey,
    createdAt: { $gte: since },
    status: { $in: ['pending', 'sent'] },
  });
  
  return !!existing;
};

farmerSuggestionSchema.statics.createSuggestion = async function(data) {
  const suggestion = new this(data);
  await suggestion.save();
  return suggestion;
};

farmerSuggestionSchema.statics.markAsSent = async function(suggestionId, telegramMessageId) {
  return this.findByIdAndUpdate(
    suggestionId,
    {
      $set: {
        status: 'sent',
        sentAt: new Date(),
        telegramMessageId,
      },
    },
    { new: true }
  );
};

farmerSuggestionSchema.statics.markAsClicked = async function(suggestionId) {
  return this.findByIdAndUpdate(
    suggestionId,
    {
      $set: {
        status: 'clicked',
        clickedAt: new Date(),
      },
    },
    { new: true }
  );
};

farmerSuggestionSchema.statics.getPendingSuggestions = async function(limit = 100) {
  return this.find({ status: 'pending' })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
};

farmerSuggestionSchema.statics.getStats = async function(options = {}) {
  const { regionId, days = 7 } = options;
  
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  const match = { createdAt: { $gte: since } };
  if (regionId) match.regionId = regionId;
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);
};

const FarmerSuggestion = mongoose.model('FarmerSuggestion', farmerSuggestionSchema);

export default FarmerSuggestion;
