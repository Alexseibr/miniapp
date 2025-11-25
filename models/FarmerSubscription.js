import mongoose from 'mongoose';

const farmerSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    telegramId: {
      type: Number,
      required: true,
      index: true,
    },
    tier: {
      type: String,
      enum: ['free', 'pro', 'max'],
      default: 'free',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'pending'],
      default: 'active',
      index: true,
    },
    features: {
      maxShowcaseAds: { type: Number, default: 1 },
      autoBoostHours: { type: Number, default: null },
      premiumCards: { type: Boolean, default: false },
      seasonalAccess: { type: Boolean, default: false },
      detailedAnalytics: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
    },
    pricing: {
      monthlyPrice: { type: Number, default: 0 },
      currency: { type: String, default: 'BYN' },
    },
    billing: {
      startDate: { type: Date, default: Date.now },
      endDate: { type: Date },
      lastPaymentDate: { type: Date },
      nextPaymentDate: { type: Date },
      paymentMethod: { type: String },
      transactionHistory: [{
        amount: Number,
        currency: String,
        date: Date,
        status: String,
        transactionId: String,
      }],
    },
    boosts: {
      available: { type: Number, default: 0 },
      used: { type: Number, default: 0 },
      lastBoostAt: { type: Date },
    },
    stats: {
      totalSpent: { type: Number, default: 0 },
      adsPromoted: { type: Number, default: 0 },
      showcaseSlots: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

farmerSubscriptionSchema.index({ telegramId: 1, status: 1 });
farmerSubscriptionSchema.index({ tier: 1, status: 1 });

farmerSubscriptionSchema.statics.getTierFeatures = function(tier) {
  const tiers = {
    free: {
      maxShowcaseAds: 1,
      autoBoostHours: null,
      premiumCards: false,
      seasonalAccess: false,
      detailedAnalytics: false,
      prioritySupport: false,
      monthlyPrice: 0,
    },
    pro: {
      maxShowcaseAds: 5,
      autoBoostHours: 48,
      premiumCards: false,
      seasonalAccess: false,
      detailedAnalytics: true,
      prioritySupport: false,
      monthlyPrice: 0.99,
    },
    max: {
      maxShowcaseAds: 20,
      autoBoostHours: 24,
      premiumCards: true,
      seasonalAccess: true,
      detailedAnalytics: true,
      prioritySupport: true,
      monthlyPrice: 2.49,
    },
  };
  return tiers[tier] || tiers.free;
};

farmerSubscriptionSchema.methods.canBoost = function() {
  if (this.tier === 'free') return false;
  const features = this.constructor.getTierFeatures(this.tier);
  if (!features.autoBoostHours) return false;
  
  if (!this.boosts.lastBoostAt) return true;
  
  const hoursSinceLastBoost = (Date.now() - this.boosts.lastBoostAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastBoost >= features.autoBoostHours;
};

farmerSubscriptionSchema.methods.useBoost = async function() {
  if (!this.canBoost()) return false;
  
  this.boosts.used += 1;
  this.boosts.lastBoostAt = new Date();
  await this.save();
  return true;
};

export default mongoose.model('FarmerSubscription', farmerSubscriptionSchema);
