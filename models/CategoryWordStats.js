import mongoose from 'mongoose';

const categoryWordStatsSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  },
  subcategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  word: {
    type: String,
    required: true,
    index: true,
  },
  count: {
    type: Number,
    default: 1,
    min: 1,
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

categoryWordStatsSchema.index({ categoryId: 1, word: 1 }, { unique: true });
categoryWordStatsSchema.index({ subcategoryId: 1, word: 1 });
categoryWordStatsSchema.index({ count: 1, lastUpdatedAt: 1 });

const CategoryWordStats = mongoose.model('CategoryWordStats', categoryWordStatsSchema);

export default CategoryWordStats;
