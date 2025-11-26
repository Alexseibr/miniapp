import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema({
  adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true },
  createdAt: { type: Date, default: Date.now },
  views: { type: Number, default: 0 },
  contacts: { type: Number, default: 0 },
  favorites: { type: Number, default: 0 },
  messages: { type: Number, default: 0 },
  priceHistory: [{
    price: Number,
    date: { type: Date, default: Date.now },
  }],
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'sold', 'expired'],
    default: 'active',
  },
  qualityScore: { type: Number, default: 0.5, min: 0, max: 1 },
  lastActivityAt: { type: Date, default: Date.now },
});

const audienceSegmentSchema = new mongoose.Schema({
  categoryId: { type: String, required: true },
  categoryName: { type: String },
  demandScore: { type: Number, default: 0.5, min: 0, max: 1 },
  distanceAvg: { type: Number, default: 0 },
  buyerCount: { type: Number, default: 0 },
  searchVolume: { type: Number, default: 0 },
  trendDirection: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' },
});

const issueSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: [
      'bad_photos', 
      'no_photos',
      'high_price', 
      'low_price', 
      'no_description',
      'short_description',
      'low_demand', 
      'wrong_category',
      'dying_listing',
      'inactive_listing',
      'missing_keywords',
      'poor_timing',
    ],
    required: true,
  },
  adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad' },
  adTitle: { type: String },
  severity: { type: Number, default: 0.5, min: 0, max: 1 },
  message: { type: String, required: true },
  actionRequired: { type: String },
  isResolved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const recommendationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'add_photos',
      'improve_description',
      'adjust_price',
      'change_category',
      'optimal_timing',
      'add_keywords',
      'seasonal_opportunity',
      'demand_alert',
      'competitor_alert',
      'quality_improvement',
      'reactivate_listing',
      'new_product_idea',
    ],
    required: true,
  },
  text: { type: String, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad' },
  adTitle: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  isRead: { type: Boolean, default: false },
  isActedUpon: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
});

const predictionSchema = new mongoose.Schema({
  adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true },
  adTitle: { type: String },
  expectedViews3d: { type: Number, default: 0 },
  expectedViews7d: { type: Number, default: 0 },
  expectedContacts3d: { type: Number, default: 0 },
  expectedContacts7d: { type: Number, default: 0 },
  chanceOfSale: { type: Number, default: 0, min: 0, max: 1 },
  optimalPrice: { type: Number },
  optimalPublishTime: { type: String },
  confidence: { type: Number, default: 0.5, min: 0, max: 1 },
  factors: [{
    name: { type: String },
    impact: { type: Number },
    description: { type: String },
  }],
  updatedAt: { type: Date, default: Date.now },
});

const seasonalInsightSchema = new mongoose.Schema({
  categoryId: { type: String, required: true },
  categoryName: { type: String },
  nextPeakStart: { type: Date },
  nextPeakEnd: { type: Date },
  currentDemandLevel: { type: String, enum: ['low', 'medium', 'high', 'peak'], default: 'medium' },
  notes: { type: String },
  recommendedAction: { type: String },
  priceMultiplier: { type: Number, default: 1.0 },
});

const missedOpportunitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['trending_category', 'high_demand', 'low_competition', 'seasonal_peak', 'local_search'],
    required: true,
  },
  categoryId: { type: String },
  categoryName: { type: String },
  searchQuery: { type: String },
  demandScore: { type: Number, default: 0.5 },
  competitorCount: { type: Number, default: 0 },
  estimatedEarnings: { type: Number },
  message: { type: String, required: true },
  radius: { type: Number },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
});

const performanceMetricsSchema = new mongoose.Schema({
  period: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  date: { type: Date, required: true },
  totalViews: { type: Number, default: 0 },
  totalContacts: { type: Number, default: 0 },
  totalFavorites: { type: Number, default: 0 },
  totalMessages: { type: Number, default: 0 },
  avgResponseTime: { type: Number },
  conversionRate: { type: Number, default: 0 },
  revenueEstimate: { type: Number, default: 0 },
});

const sellerTwinSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerTelegramId: { type: Number, required: true, index: true },
  
  inventory: [inventoryItemSchema],
  
  audience: [audienceSegmentSchema],
  
  issues: [issueSchema],
  
  recommendations: [recommendationSchema],
  
  predictions: [predictionSchema],
  
  seasonalInsights: [seasonalInsightSchema],
  
  missedOpportunities: [missedOpportunitySchema],
  
  performanceHistory: [performanceMetricsSchema],
  
  settings: {
    notificationsEnabled: { type: Boolean, default: true },
    notifyOnDemandSpike: { type: Boolean, default: true },
    notifyOnCompetitor: { type: Boolean, default: true },
    notifyOnIssue: { type: Boolean, default: true },
    notifyOnOpportunity: { type: Boolean, default: true },
    preferredLanguage: { type: String, default: 'ru' },
    radiusKm: { type: Number, default: 10 },
  },
  
  stats: {
    totalAds: { type: Number, default: 0 },
    activeAds: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    totalContacts: { type: Number, default: 0 },
    avgQualityScore: { type: Number, default: 0.5 },
    avgPricePosition: { type: String, enum: ['below', 'fair', 'above'], default: 'fair' },
    topCategories: [{ type: String }],
    lastActiveAt: { type: Date },
  },
  
  learningData: {
    bestPublishTimes: [{ hour: Number, dayOfWeek: Number, score: Number }],
    topKeywords: [{ keyword: String, score: Number }],
    priceElasticity: { type: Number, default: 1.0 },
    seasonalPatterns: [{ month: Number, categoryId: String, multiplier: Number }],
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastAnalyzedAt: { type: Date },
});

sellerTwinSchema.index({ sellerId: 1 }, { unique: true });
sellerTwinSchema.index({ sellerTelegramId: 1 }, { unique: true });
sellerTwinSchema.index({ 'inventory.adId': 1 });
sellerTwinSchema.index({ 'issues.isResolved': 1, 'issues.severity': -1 });
sellerTwinSchema.index({ 'recommendations.isRead': 1, 'recommendations.priority': 1 });
sellerTwinSchema.index({ updatedAt: -1 });

sellerTwinSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

sellerTwinSchema.methods.getUnresolvedIssues = function() {
  return this.issues.filter(i => !i.isResolved).sort((a, b) => b.severity - a.severity);
};

sellerTwinSchema.methods.getUnreadRecommendations = function() {
  return this.recommendations.filter(r => !r.isRead).sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
};

sellerTwinSchema.methods.getActiveInventory = function() {
  return this.inventory.filter(i => i.status === 'active');
};

sellerTwinSchema.statics.findOrCreate = async function(sellerId, sellerTelegramId) {
  let twin = await this.findOne({ sellerTelegramId });
  if (!twin) {
    twin = new this({
      sellerId,
      sellerTelegramId,
    });
    await twin.save();
  }
  return twin;
};

const SellerTwin = mongoose.model('SellerTwin', sellerTwinSchema);

export default SellerTwin;
