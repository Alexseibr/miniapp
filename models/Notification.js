const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    userTelegramId: { type: Number, required: true },
    adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true },
    type: {
      type: String,
      enum: ['price_change', 'status_change'],
      required: true,
    },
    oldPrice: Number,
    newPrice: Number,
    oldStatus: String,
    newStatus: String,
    isSent: { type: Boolean, default: false },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

NotificationSchema.index({ userTelegramId: 1, isSent: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
