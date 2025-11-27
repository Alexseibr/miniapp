import mongoose from 'mongoose';

const brandStatsSchema = new mongoose.Schema({
  brand: {
    type: String,
    required: true,
    index: true,
  },
  brandKey: {
    type: String,
    required: true,
    lowercase: true,
    index: true,
  },
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
  countLocal: {
    type: Number,
    default: 0,
  },
  countCountry: {
    type: Number,
    default: 0,
  },
  countByCity: {
    type: Map,
    of: Number,
    default: {},
  },
  isVisible: {
    type: Boolean,
    default: false,
  },
  isVisibleCountry: {
    type: Boolean,
    default: false,
  },
  icon: {
    type: String,
    default: null,
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

brandStatsSchema.index({ categoryId: 1, brandKey: 1 }, { unique: true });
brandStatsSchema.index({ categorySlug: 1, brandKey: 1 });
brandStatsSchema.index({ isVisible: 1, categoryId: 1 });
brandStatsSchema.index({ isVisibleCountry: 1, categoryId: 1 });

const BrandStats = mongoose.model('BrandStats', brandStatsSchema);

export default BrandStats;
