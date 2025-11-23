// models/UserSettings.js
const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
  userTelegramId: { type: String, required: true, unique: true },
  notifyOnPriceChange: { type: Boolean, default: true },
  notifyOnStatusChange: { type: Boolean, default: true },
});

module.exports = mongoose.model('UserSettings', userSettingsSchema);
