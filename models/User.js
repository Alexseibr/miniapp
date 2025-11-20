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
    createdAt: { type: Date, default: Date.now },
    lastKnownPrice: { type: Number },
    lastKnownStatus: { type: String },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
    telegramId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    telegramUsername: {
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
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    avatar: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    // Legacy fields to preserve existing functionality in the marketplace
    name: {
      type: String,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
    },
    favoritesCount: {
      type: Number,
      default: 0,
    },
    ordersCount: {
      type: Number,
      default: 0,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    isModerator: {
      type: Boolean,
      default: false,
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
    isBlocked: {
      type: Boolean,
      default: false,
    },
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
userSchema.index({ 'favorites.adId': 1 });

const User = mongoose.model('User', userSchema);

async function initUserIndexes() {
  // Используем syncIndexes для применения unique/sparse индексов даже при обновлении схемы
  await User.syncIndexes();
}

module.exports = User;
module.exports.initUserIndexes = initUserIndexes;
