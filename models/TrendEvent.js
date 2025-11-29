import mongoose from 'mongoose';

const trendEventSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  },
  categorySlug: {
    type: String,
    required: true,
    index: true,
  },
  categoryName: {
    type: String,
    required: true,
  },
  brandKey: {
    type: String,
    default: null,
    index: true,
  },
  brandName: {
    type: String,
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
  citySlug: {
    type: String,
    index: true,
  },
  cityName: {
    type: String,
  },
  eventType: {
    type: String,
    enum: ['DEMAND_SPIKE', 'SUPPLY_SPIKE'],
    required: true,
    index: true,
  },
  deltaPercent: {
    type: Number,
    required: true,
  },
  previousValue: {
    type: Number,
    required: true,
  },
  currentValue: {
    type: Number,
    required: true,
  },
  period: {
    type: String,
    enum: ['day', 'week'],
    default: 'day',
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
}, {
  timestamps: true,
});

trendEventSchema.index({ location: '2dsphere' });
trendEventSchema.index({ isActive: 1, expiresAt: 1 });
trendEventSchema.index({ categorySlug: 1, citySlug: 1, eventType: 1 });
trendEventSchema.index({ createdAt: -1 });

const TrendEvent = mongoose.model('TrendEvent', trendEventSchema);

export default TrendEvent;
