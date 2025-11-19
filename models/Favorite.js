const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
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
    lastKnownPrice: {
      type: Number,
    },
    lastKnownStatus: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

favoriteSchema.index({ userTelegramId: 1, adId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
