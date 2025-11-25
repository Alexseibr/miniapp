import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
    parentSlug: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      required: true,
      default: 1,
      index: true,
    },
    isLeaf: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    icon3d: {
      type: String,
      default: null,
    },
    keywordTokens: {
      type: [String],
      default: [],
      index: true,
    },
    boostWeight: {
      type: Number,
      default: 1.0,
    },
    isOther: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['product', 'service', 'real-estate', 'vehicle', 'agro', null],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ parentSlug: 1, isOther: 1 });

export default mongoose.model('Category', categorySchema);
