import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const DAY_MS = 24 * 60 * 60 * 1000;

const adSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 4000,
    },
    categoryId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    subcategoryId: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: 'BYN',
    },
    attributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    photos: {
      type: [String],
      default: [],
    },
    sellerTelegramId: {
      type: Number,
      required: true,
      index: true,
    },
    deliveryType: {
      type: String,
      enum: ['pickup_only', 'delivery_only', 'delivery_and_pickup'],
      default: null,
    },
    deliveryRadiusKm: {
      type: Number,
      min: 0,
      default: null,
    },
    location: locationSchema,
    seasonCode: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'archived', 'hidden'],
      required: true,
      default: 'active',
    },
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      required: true,
      default: 'pending',
    },
    lifetimeDays: {
      type: Number,
      required: true,
      min: 1,
    },
    validUntil: {
      type: Date,
    },
    isLiveSpot: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

function computeValidUntil(createdAt, lifetimeDays) {
  if (!createdAt || !lifetimeDays) return undefined;
  return new Date(createdAt.getTime() + lifetimeDays * DAY_MS);
}

adSchema.pre('validate', function setValidUntil(next) {
  if (!this.validUntil && this.lifetimeDays) {
    const baseDate = this.createdAt || new Date();
    this.validUntil = computeValidUntil(baseDate, this.lifetimeDays);
  }
  next();
});

adSchema.pre('findOneAndUpdate', async function ensureValidUntil(next) {
  const update = this.getUpdate() || {};
  const hasValidUntilInUpdate =
    Object.prototype.hasOwnProperty.call(update, 'validUntil') ||
    (update.$set && Object.prototype.hasOwnProperty.call(update.$set, 'validUntil'));

  if (hasValidUntilInUpdate) return next();

  const lifetimeFromUpdate = update.lifetimeDays ?? update.$set?.lifetimeDays;
  const doc = await this.model.findOne(this.getQuery()).lean();

  if (!doc) return next();
  if (!lifetimeFromUpdate && doc.validUntil) return next();

  const lifetimeDays = lifetimeFromUpdate ?? doc.lifetimeDays;
  if (!lifetimeDays) return next();

  const baseDate = doc.createdAt ? new Date(doc.createdAt) : new Date();
  const validUntil = computeValidUntil(baseDate, lifetimeDays);

  const newUpdate = { ...update };
  newUpdate.$set = { ...(update.$set || {}), validUntil };
  this.setUpdate(newUpdate);

  next();
});

export default mongoose.model('Ad', adSchema);
