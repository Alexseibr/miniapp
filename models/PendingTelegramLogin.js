const mongoose = require('mongoose');

const PendingTelegramLoginSchema = new mongoose.Schema({
  token: { type: String, unique: true, required: true },
  status: { type: String, enum: ['pending', 'completed', 'expired'], default: 'pending' },
  telegramId: String,
  telegramUsername: String,
  phone: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  jwtToken: String,
  createdAt: { type: Date, default: Date.now },
  completedAt: Date,
  expiresAt: { type: Date, required: true },
});

PendingTelegramLoginSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PendingTelegramLogin', PendingTelegramLoginSchema);
