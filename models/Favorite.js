// models/Favorite.js
import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, index: true },
    createdAt: { type: Date, default: Date.now },
    userTelegramId: { type: String, required: true, index: true },
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ad',
      required: true,
      index: true,
    },

    notifyOnPriceChange: { type: Boolean, default: true },
    notifyOnStatusChange: { type: Boolean, default: true },

  },
  {
    timestamps: false,
  }
);

favoriteSchema.index({ userTelegramId: 1, adId: 1 }, { unique: true });
favoriteSchema.index({ user: 1, itemId: 1 });

export default mongoose.model('Favorite', favoriteSchema);
