const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    userTelegramId: {
      type: Number,
      required: true,
      index: true,
    },
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ad',
      required: true,
    },
    adTitleSnapshot: {
      type: String,
      trim: true,
    },
    oldPrice: { type: Number },
    newPrice: { type: Number },
    oldStatus: { type: String },
    newStatus: { type: String },
    type: {
      type: String,
      enum: ['price_drop', 'status_change'],
      required: true,
    },
  },
  { timestamps: true }
);

alertSchema.index({ userTelegramId: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
