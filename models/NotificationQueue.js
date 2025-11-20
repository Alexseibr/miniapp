// models/NotificationQueue.js
const mongoose = require('mongoose');

const notificationQueueSchema = new mongoose.Schema({
  userTelegramId: { type: String, required: true, index: true },
  adId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ad',
    required: true,
  },

  type: {
    type: String,
    enum: ['price_change', 'status_change'],
    required: true,
  },

  text: { type: String, required: true },

  status: {
    type: String,
    enum: ['pending', 'sent', 'error'],
    default: 'pending',
    index: true,
  },

  createdAt: { type: Date, default: Date.now },
  sentAt: { type: Date },
  errorMessage: { type: String },
});

module.exports = mongoose.model('NotificationQueue', notificationQueueSchema);
