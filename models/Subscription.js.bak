const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    userTelegramId: {
      type: Number,
      required: true,
      index: true,
    },
    filters: {
      categoryId: { type: String, trim: true },
      subcategoryId: { type: String, trim: true },
      seasonCode: { type: String, trim: true },
      minPrice: { type: Number, min: 0 },
      maxPrice: { type: Number, min: 0 },
      location: {
        lat: Number,
        lng: Number,
        radiusKm: { type: Number, min: 0, max: 100 },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastNotificationAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

subscriptionSchema.index({ userTelegramId: 1, isActive: 1 });
subscriptionSchema.index({ 'filters.categoryId': 1, isActive: 1 });
subscriptionSchema.index({ 'filters.subcategoryId': 1, isActive: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
