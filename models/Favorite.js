// models/Favorite.js
const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ad: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true, index: true },
    // legacy fields for backward compatibility
    adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', index: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, index: true },
    userTelegramId: { type: String, index: true },
    notifyOnPriceChange: { type: Boolean, default: true },
    notifyOnStatusChange: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

favoriteSchema.index({ user: 1, ad: 1 }, { unique: true });
favoriteSchema.index({ userTelegramId: 1, adId: 1 });
favoriteSchema.index({ user: 1, itemId: 1 });

favoriteSchema.pre('validate', function syncAdFields(next) {
  if (this.adId && !this.ad) {
    this.ad = this.adId;
  }

  if (this.ad && !this.adId) {
    this.adId = this.ad;
  }

  return next();
});

module.exports = mongoose.model('Favorite', favoriteSchema);
