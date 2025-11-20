// models/Favorite.js
const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    userTelegramId: { type: String, required: true, index: true },
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ad',
      required: true,
      index: true,
    },

    notifyOnPriceChange: { type: Boolean, default: true },
    notifyOnStatusChange: { type: Boolean, default: true },

    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  }
);

favoriteSchema.index({ userTelegramId: 1, adId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
