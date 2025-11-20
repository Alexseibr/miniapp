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
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    startAt: {
      type: Date,
    },
    endAt: {
      type: Date,
    },
    description: {
      type: String,
      trim: true,
    },
    config: {
      categories: [{ type: String }],
      subcategories: [{ type: String }],
    },
  },
  {
    timestamps: true,
  }
);

seasonSchema.index({ code: 1 }, { unique: true });
seasonSchema.index({ isActive: 1 });

module.exports = mongoose.model('Season', seasonSchema);
