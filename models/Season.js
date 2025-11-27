import mongoose from 'mongoose';

const seasonSchema = new mongoose.Schema(
  {
    code: {
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
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    type: {
      type: String,
      enum: ['store', 'farmer', 'both'],
      default: 'both',
      index: true,
    },
    niche: {
      type: String,
      trim: true,
      lowercase: true,
    },
    isGeoFocused: {
      type: Boolean,
      default: false,
    },
    defaultRadiusKm: {
      type: Number,
      default: null,
    },
    specialFilters: {
      enableTulips: { type: Boolean, default: false },
      enableCraft: { type: Boolean, default: false },
      enableFarm: { type: Boolean, default: false },
    },
    bannerUrl: {
      type: String,
      trim: true,
    },
    iconUrl: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      trim: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
    badges: [{
      type: String,
      trim: true,
    }],
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
  },
  {
    timestamps: true,
  }
);

seasonSchema.index({ isActive: 1, startDate: 1 });
seasonSchema.index({ code: 1 });
seasonSchema.index({ type: 1, isActive: 1 });

seasonSchema.statics.findActive = async function() {
  const now = new Date();
  return this.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).sort({ priority: -1 });
};

seasonSchema.statics.findByCode = async function(code) {
  return this.findOne({ code: code.toLowerCase() });
};

seasonSchema.statics.getActiveForType = async function(type) {
  const now = new Date();
  return this.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    type: { $in: [type, 'both'] },
  }).sort({ priority: -1 });
};

const Season = mongoose.model('Season', seasonSchema);

export const Campaign = Season;

export default Season;
