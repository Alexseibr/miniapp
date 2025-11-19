const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema(
  {
    lat: Number,
    lng: Number,
    updatedAt: Date,
  },
  { _id: false }
);

const FavoriteSchema = new mongoose.Schema(
  {
    adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true },
    addedAt: { type: Date, default: Date.now },
    lastKnownPrice: { type: Number },
    lastKnownStatus: { type: String },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      trim: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['user', 'seller', 'admin'],
      default: 'user',
    },
    socialLinks: {
      instagram: String,
      vk: String,
      facebook: String,
      website: String,
    },
    privacy: {
      showPhone: {
        type: Boolean,
        default: false,
      },
      showSocials: {
        type: Boolean,
        default: true,
      },
    },
    location: LocationSchema,
    isActive: {
      type: Boolean,
      default: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    favorites: {
      type: [FavoriteSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ telegramId: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
