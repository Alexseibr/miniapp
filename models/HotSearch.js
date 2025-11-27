import mongoose from 'mongoose';

const hotSearchSchema = new mongoose.Schema({
  normalizedQuery: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  displayQuery: {
    type: String,
    required: true,
    trim: true,
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
  cityName: {
    type: String,
    default: null,
  },
  count: {
    type: Number,
    default: 0,
  },
  hourlyCount: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

hotSearchSchema.index({ geoHash: 1, normalizedQuery: 1 }, { unique: true });
hotSearchSchema.index({ geoHash: 1, count: -1 });
hotSearchSchema.index({ isActive: 1, count: -1 });
hotSearchSchema.index({ lastUpdatedAt: 1 });

const HotSearch = mongoose.model('HotSearch', hotSearchSchema);

export default HotSearch;
