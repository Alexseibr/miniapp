import mongoose from 'mongoose';

const contactEventSchema = new mongoose.Schema(
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
    channel: {
      type: String,
      enum: ['phone', 'telegram', 'instagram', 'whatsapp', 'chat'],
      required: true,
    },
    feedbackSubmitted: {
      type: Boolean,
      default: false,
    },
    feedbackId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdFeedback',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

contactEventSchema.index({ adId: 1, buyerId: 1 });
contactEventSchema.index({ adId: 1, buyerTelegramId: 1 });
contactEventSchema.index({ sellerId: 1, createdAt: -1 });
contactEventSchema.index({ createdAt: -1 });
contactEventSchema.index({ feedbackSubmitted: 1, createdAt: -1 });

contactEventSchema.statics.findPendingFeedback = async function(buyerId, buyerTelegramId, limit = 5) {
  const query = {
    feedbackSubmitted: false,
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  };
  
  if (buyerId) {
    query.buyerId = buyerId;
  } else if (buyerTelegramId) {
    query.buyerTelegramId = buyerTelegramId;
  } else {
    return [];
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('adId', 'title photos previewUrl price currency')
    .lean();
};

contactEventSchema.statics.hasRecentContact = async function(adId, buyerId, buyerTelegramId) {
  const query = {
    adId,
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  };
  
  if (buyerId) {
    query.buyerId = buyerId;
  } else if (buyerTelegramId) {
    query.buyerTelegramId = buyerTelegramId;
  } else {
    return null;
  }
  
  return this.findOne(query).sort({ createdAt: -1 });
};

contactEventSchema.statics.getContactStats = async function(adId) {
  const stats = await this.aggregate([
    { $match: { adId: new mongoose.Types.ObjectId(adId) } },
    {
      $group: {
        _id: '$channel',
        count: { $sum: 1 },
      },
    },
  ]);
  
  const result = {
    total: 0,
    byChannel: { phone: 0, telegram: 0, chat: 0, whatsapp: 0 },
  };
  
  stats.forEach(s => {
    result.byChannel[s._id] = s.count;
    result.total += s.count;
  });
  
  return result;
};

contactEventSchema.statics.getSellerContactStats = async function(sellerId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const stats = await this.aggregate([
    {
      $match: {
        sellerId: new mongoose.Types.ObjectId(sellerId),
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          channel: '$channel',
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { '_id.date': 1 },
    },
  ]);
  
  return stats;
};

const ContactEvent = mongoose.model('ContactEvent', contactEventSchema);

export default ContactEvent;
