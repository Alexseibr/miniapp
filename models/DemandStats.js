import mongoose from 'mongoose';

const demandStatsSchema = new mongoose.Schema({
  normalizedQuery: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  detectedCategoryId: {
    type: String,
    default: null,
    index: true,
  },
  
  geoHash: {
    type: String,
    required: true,
    index: true,
  },
  citySlug: {
    type: String,
    default: null,
  },
  
  searchesCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  uniqueUsersCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  period: {
    type: String,
    enum: ['hour', 'day', 'week'],
    default: 'day',
    index: true,
  },
  periodStart: {
    type: Date,
    required: true,
    index: true,
  },
  
  isHighDemand: {
    type: Boolean,
    default: false,
    index: true,
  },
  notifiedSellersAt: {
    type: Date,
    default: null,
  },
  
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

demandStatsSchema.index({ normalizedQuery: 1, geoHash: 1, period: 1, periodStart: 1 }, { unique: true });
demandStatsSchema.index({ isHighDemand: 1, notifiedSellersAt: 1 });

const DemandStats = mongoose.model('DemandStats', demandStatsSchema);

export default DemandStats;
