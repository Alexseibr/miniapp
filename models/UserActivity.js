import mongoose from 'mongoose';

const userActivitySchema = new mongoose.Schema({
  telegramId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  viewedCategories: [{
    categoryId: String,
    count: { type: Number, default: 1 },
    lastViewed: { type: Date, default: Date.now }
  }],
  
  viewedAds: [{
    adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad' },
    viewedAt: { type: Date, default: Date.now }
  }],
  
  favoriteAds: [{
    adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad' },
    addedAt: { type: Date, default: Date.now }
  }],
  
  contactClicks: [{
    adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad' },
    clickedAt: { type: Date, default: Date.now }
  }],
  
  searchQueries: [{
    query: String,
    categoryId: String,
    resultsCount: Number,
    searchedAt: { type: Date, default: Date.now }
  }],
  
  preferredCategories: [String],
  
  preferredPriceRange: {
    min: Number,
    max: Number
  },
  
  preferredLocation: {
    lat: Number,
    lng: Number,
    radiusKm: { type: Number, default: 10 }
  },
  
  lastActive: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  sessionCount: {
    type: Number,
    default: 0
  },
  
  totalViews: {
    type: Number,
    default: 0
  },
  
  totalSearches: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

userActivitySchema.index({ 'viewedCategories.categoryId': 1 });
userActivitySchema.index({ 'searchQueries.query': 'text' });
userActivitySchema.index({ lastActive: -1 });

userActivitySchema.methods.getTopCategories = function(limit = 5) {
  return this.viewedCategories
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(c => c.categoryId);
};

userActivitySchema.methods.getRecentSearches = function(limit = 10) {
  return this.searchQueries
    .sort((a, b) => b.searchedAt - a.searchedAt)
    .slice(0, limit)
    .map(s => s.query);
};

userActivitySchema.statics.trackView = async function(telegramId, adId, categoryId) {
  return this.findOneAndUpdate(
    { telegramId },
    {
      $push: {
        viewedAds: { $each: [{ adId, viewedAt: new Date() }], $slice: -100 }
      },
      $inc: { totalViews: 1 },
      $set: { lastActive: new Date() }
    },
    { upsert: true, new: true }
  );
};

userActivitySchema.statics.trackSearch = async function(telegramId, query, categoryId, resultsCount) {
  return this.findOneAndUpdate(
    { telegramId },
    {
      $push: {
        searchQueries: { 
          $each: [{ query, categoryId, resultsCount, searchedAt: new Date() }], 
          $slice: -50 
        }
      },
      $inc: { totalSearches: 1 },
      $set: { lastActive: new Date() }
    },
    { upsert: true, new: true }
  );
};

const UserActivity = mongoose.model('UserActivity', userActivitySchema);

export default UserActivity;
