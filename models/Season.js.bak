const mongoose = require('mongoose');

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
  },
  {
    timestamps: true,
  }
);

seasonSchema.index({ isActive: 1, startDate: 1 });

module.exports = mongoose.model('Season', seasonSchema);
