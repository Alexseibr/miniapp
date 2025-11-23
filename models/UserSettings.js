// models/UserSettings.js
import mongoose from 'mongoose';

const userSettingsSchema = new mongoose.Schema({
  userTelegramId: { type: String, required: true, unique: true },
  notifyOnPriceChange: { type: Boolean, default: true },
  notifyOnStatusChange: { type: Boolean, default: true },
});

export default mongoose.model('UserSettings', userSettingsSchema);
