import mongoose from 'mongoose';

const searchLogSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    trim: true,
  },
  normalizedQuery: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  },
  geoHash: {
    type: String,
    index: true,
  },
  citySlug: {
    type: String,
    default: null,
  },
  resultsCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

searchLogSchema.index({ location: '2dsphere' });
searchLogSchema.index({ normalizedQuery: 1, geoHash: 1 });
searchLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const SearchLog = mongoose.model('SearchLog', searchLogSchema);

export default SearchLog;
