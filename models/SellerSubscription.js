import mongoose from 'mongoose';

const sellerSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userTelegramId: {
      type: Number,
      required: true,
      index: true,
    },
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
    notifyNewProducts: {
      type: Boolean,
      default: true,
    },
    notifyPriceDrops: {
      type: Boolean,
      default: true,
    },
    notifySeasonal: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

sellerSubscriptionSchema.index({ userId: 1, sellerId: 1 }, { unique: true });
sellerSubscriptionSchema.index({ sellerId: 1, createdAt: -1 });
sellerSubscriptionSchema.index({ userId: 1, createdAt: -1 });

sellerSubscriptionSchema.statics.isSubscribed = async function(userId, sellerId) {
  const sub = await this.findOne({ userId, sellerId });
  return !!sub;
};

sellerSubscriptionSchema.statics.getSubscribersCount = async function(sellerId) {
  return this.countDocuments({ sellerId });
};

sellerSubscriptionSchema.statics.getSubscriberIds = async function(sellerId, options = {}) {
  const query = { sellerId };
  
  if (options.notifyNewProducts) {
    query.notifyNewProducts = true;
  }
  if (options.notifyPriceDrops) {
    query.notifyPriceDrops = true;
  }
  if (options.notifySeasonal) {
    query.notifySeasonal = true;
  }
  
  const subs = await this.find(query).select('userTelegramId userId');
  return subs.map(s => ({
    telegramId: s.userTelegramId,
    userId: s.userId,
  }));
};

sellerSubscriptionSchema.statics.getUserSubscriptions = async function(userId) {
  return this.find({ userId })
    .populate('sellerId', 'name avatar isFarmer slug ratings subscribersCount')
    .sort({ createdAt: -1 });
};

const SellerSubscription = mongoose.model('SellerSubscription', sellerSubscriptionSchema);

export default SellerSubscription;
