const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    updatedAt: { type: Date, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    telegramId: { type: Number, required: true, unique: true, index: true },
    username: { type: String, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    role: { type: String, enum: ['buyer', 'seller', 'both'], required: true },
    phoneVerified: { type: Boolean, default: false },
    verifiedPhone: { type: String, trim: true },
    instagram: { type: String, trim: true },
    showUsername: { type: Boolean, default: false },
    showPhone: { type: Boolean, default: false },
    showInstagram: { type: Boolean, default: false },
    location: locationSchema,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
