import mongoose from 'mongoose';

const searchAlertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  telegramId: {
    type: Number,
    index: true,
    default: null,
  },
  sessionId: {
    type: String,
    default: null,
  },
  
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
    index: true,
  },
  detectedCategoryId: {
    type: String,
    default: null,
    index: true,
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
  radiusKm: {
    type: Number,
    default: 5,
    min: 0.1,
  },
  citySlug: {
    type: String,
    default: null,
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  notifiedAt: {
    type: Date,
    default: null,
  },
  notificationsCount: {
    type: Number,
    default: 0,
  },
  lastMatchedAdId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ad',
    default: null,
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

searchAlertSchema.index({ location: '2dsphere' });
searchAlertSchema.index({ telegramId: 1, normalizedQuery: 1, isActive: 1 });
searchAlertSchema.index({ isActive: 1, notifiedAt: 1 });

const SearchAlert = mongoose.model('SearchAlert', searchAlertSchema);

export default SearchAlert;
