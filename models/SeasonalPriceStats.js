const mongoose = require('mongoose');

const seasonalPriceStatsSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  avgPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  minPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  maxPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  countAds: {
    type: Number,
    required: true,
    default: 0,
  },
  totalViews: {
    type: Number,
    default: 0,
  },
  totalFavorites: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

seasonalPriceStatsSchema.index({ categoryId: 1, date: -1 });

module.exports = mongoose.model('SeasonalPriceStats', seasonalPriceStatsSchema);
