const mongoose = require('mongoose');
const NotificationEvent = require('./NotificationEvent');

const GeoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: undefined,
    },
  },
  { _id: false }
);

const LocationSchema = new mongoose.Schema(
  {
    lat: { type: Number },
    lng: { type: Number },
    geo: { type: GeoPointSchema, default: undefined },
  },
  { _id: false }
);

const adSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    categoryId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subcategoryId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'BYN',
      trim: true,
    },
    photos: [{
      type: String,
      trim: true,
    }],
    attributes: {
      type: Map,
      of: String,
      default: {},
    },
    sellerTelegramId: {
      type: Number,
      required: true,
      index: true,
    },
    seasonCode: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'sold', 'archived', 'hidden', 'expired'],
      default: 'active',
      index: true,
    },
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    moderationComment: {
      type: String,
      default: null,
      trim: true,
    },
    deliveryOptions: [{
      type: String,
      enum: ['pickup', 'delivery', 'shipping'],
    }],
    lifetimeDays: {
      type: Number,
      default: 30,
    },
    validUntil: {
      type: Date,
    },
    isLiveSpot: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    location: LocationSchema,
    watchers: {
      type: [
        {
          type: Number,
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

adSchema.index({ 'location.geo': '2dsphere' });

// Автоматический расчет validUntil при создании
adSchema.pre('save', function (next) {
  if (this.isNew && !this.validUntil) {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (this.lifetimeDays || 30));
    this.validUntil = validUntil;
  }

  const hasLocation =
    this.location &&
    this.location.lat != null &&
    this.location.lng != null;

  const hasGeoCoordinates =
    this.location &&
    this.location.geo &&
    Array.isArray(this.location.geo.coordinates) &&
    this.location.geo.coordinates.length === 2 &&
    this.location.geo.coordinates.every((value) => value != null);

  if (hasLocation && !hasGeoCoordinates) {
    if (!this.location) {
      this.location = {};
    }

    this.location.geo = {
      type: 'Point',
      coordinates: [Number(this.location.lng), Number(this.location.lat)],
    };
  }

  if (
    hasGeoCoordinates &&
    (!hasLocation || this.location.lat == null || this.location.lng == null)
  ) {
    const [lng, lat] = this.location.geo.coordinates;
    this.location = {
      ...(this.location || {}),
      lat,
      lng,
      geo: this.location.geo,
    };
  }

  if (!hasGeoCoordinates && this.geo && Array.isArray(this.geo.coordinates)) {
    const [lng, lat] = this.geo.coordinates;
    this.location = {
      ...(this.location || {}),
      lat: this.location?.lat != null ? this.location.lat : lat,
      lng: this.location?.lng != null ? this.location.lng : lng,
      geo: {
        type: 'Point',
        coordinates: [lng, lat],
      },
    };
    this.set('geo', undefined, { strict: false });
  }
  next();
});

adSchema.pre('save', async function (next) {
  if (this.isNew) {
    return next();
  }

  const priceChanged = this.isModified('price');
  const statusChanged = this.isModified('status');

  if (!priceChanged && !statusChanged) {
    return next();
  }

  try {
    const previous = await this.constructor.findById(this._id).select('price status');

    if (!previous) {
      return next();
    }

    const events = [];

    if (priceChanged) {
      events.push({
        adId: this._id,
        type: 'price_change',
        oldValue: previous.price,
        newValue: this.price,
        watchers: Array.isArray(this.watchers) ? this.watchers : [],
      });
    }

    if (statusChanged) {
      events.push({
        adId: this._id,
        type: 'status_change',
        oldValue: previous.status,
        newValue: this.status,
        watchers: Array.isArray(this.watchers) ? this.watchers : [],
      });
    }

    if (events.length) {
      await NotificationEvent.insertMany(events);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Составные индексы
adSchema.index({ status: 1, createdAt: -1 });
adSchema.index({ seasonCode: 1, status: 1 });
adSchema.index({ 'location.lat': 1, 'location.lng': 1 });
adSchema.index({ geo: '2dsphere' });

module.exports = mongoose.model('Ad', adSchema);
