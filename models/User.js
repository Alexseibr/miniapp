import mongoose from 'mongoose';

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

const AuthProviderSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['telegram', 'sms', 'email', 'google', 'apple', 'app'],
      required: true,
    },
    providerId: String,
    linkedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    telegramId: {
      type: Number,
    },
    appUserId: {
      type: String,
    },
    authProviders: {
      type: [AuthProviderSchema],
      default: [],
    },
    mergedFrom: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    mergedInto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    favoritesCount: {
      type: Number,
      default: 0,
    },
    ordersCount: {
      type: Number,
      default: 0,
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
    countryCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    preferredCurrency: {
      type: String,
      trim: true,
      uppercase: true,
    },
    preferredLocale: {
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
      enum: ['user', 'moderator', 'admin', 'super_admin', 'seller'],
      default: 'user',
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
    isActive: {
      type: Boolean,
      default: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockReason: {
      type: String,
      trim: true,
    },
    sellerRating: {
      avgScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      totalVotes: {
        type: Number,
        default: 0,
        min: 0,
      },
      lowScoreCount: {
        type: Number,
        default: 0,
        min: 0,
      },
      fraudFlags: {
        type: Number,
        default: 0,
        min: 0,
      },
      lastRatedAt: {
        type: Date,
        default: null,
      },
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

userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'favorites.adId': 1 });
userSchema.index({ countryCode: 1 });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ telegramId: 1 }, { unique: true, sparse: true });
userSchema.index({ appUserId: 1 }, { unique: true, sparse: true });
userSchema.index({ 'authProviders.type': 1 });

export default mongoose.model('User', userSchema);
