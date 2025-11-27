import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    city: { type: String, required: true, trim: true },
    district: { type: String, trim: true, default: null },
    addressLine: { type: String, trim: true, default: null },
  },
  { _id: false }
);

const ShopSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    logoUrl: { type: String, trim: true, default: null },
    coverUrl: { type: String, trim: true, default: null },
    slogan: { type: String, trim: true, default: null },
    instagram: { type: String, trim: true, default: null },
    website: { type: String, trim: true, default: null },
    telegramUsername: { type: String, trim: true, default: null },
    phone: { type: String, trim: true, default: null },
    unp: { type: String, trim: true, default: null },
    ownerFullName: { type: String, trim: true, default: null },
    location: { type: LocationSchema, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'paused'],
      default: 'pending',
      index: true,
    },
    isVerified: { type: Boolean, default: false, index: true },
    verificationRequested: { type: Boolean, default: false },
    verificationAt: { type: Date, default: null },
    analyticsPlan: {
      type: String,
      enum: ['free', 'pro', 'max'],
      default: 'free',
    },
  },
  {
    timestamps: true,
  }
);

ShopSchema.index({ ownerUserId: 1, status: 1 });

const Shop = mongoose.models.Shop || mongoose.model('Shop', ShopSchema);

export default Shop;
