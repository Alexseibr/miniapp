const mongoose = require('mongoose');
const NotificationEvent = require('./NotificationEvent');
const AdChange = require('./AdChange');

const priceHistorySchema = new mongoose.Schema(
  {
    oldPrice: { type: Number, required: true },
    newPrice: { type: Number, required: true },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    oldStatus: { type: String, required: true },
    newStatus: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const GeoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      index: '2dsphere',
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
    deliveryType: {
      type: String,
      enum: ['pickup_only', 'delivery_only', 'delivery_and_pickup'],
      default: undefined,
    },
    deliveryRadiusKm: {
      type: Number,
      min: 0,
      default: null,
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
    favoritesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    distance: {
      type: Number,
      default: null,
    },
    geo: {
      type: GeoPointSchema,
      default: undefined,
    },
    priceHistory: [priceHistorySchema],
    statusHistory: [statusHistorySchema],
    lastPriceChangeAt: { type: Date },
    hasPriceChangeForNotifications: { type: Boolean, default: false },
    hasStatusChangeForNotifications: { type: Boolean, default: false },
    location: LocationSchema,
    watchers: {
      type: [
        {
          type: Number,
        },
      ],
      default: [],
    },
    lastNotificationSnapshot: {
      price: { type: Number },
      status: { type: String },
      updatedAt: { type: Date },
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

  const coordsFromLocation = resolveCoordinatesFromLocation(this.location);
  const coordsFromGeo =
    this.geo &&
    Array.isArray(this.geo.coordinates) &&
    this.geo.coordinates.length === 2
      ? { lat: Number(this.geo.coordinates[1]), lng: Number(this.geo.coordinates[0]) }
      : null;

  // Sync location -> geo
  if (coordsFromLocation) {
    this.geo = {
      type: 'Point',
      coordinates: [coordsFromLocation.lng, coordsFromLocation.lat],
    };

    this.location = {
      ...(this.location || {}),
      lat: coordsFromLocation.lat,
      lng: coordsFromLocation.lng,
      geo: {
        type: 'Point',
        coordinates: [coordsFromLocation.lng, coordsFromLocation.lat],
      },
    };
  } else if (coordsFromGeo) {
    // Sync geo -> location when only geo is present
    this.location = {
      ...(this.location || {}),
      lat: this.location?.lat != null ? this.location.lat : coordsFromGeo.lat,
      lng: this.location?.lng != null ? this.location.lng : coordsFromGeo.lng,
      geo: {
        type: 'Point',
        coordinates: [coordsFromGeo.lng, coordsFromGeo.lat],
      },
    };
    this.geo = {
      type: 'Point',
      coordinates: [coordsFromGeo.lng, coordsFromGeo.lat],
    };
  }

  next();
});

adSchema.pre('save', async function (next) {
  if (this.isNew) {
    return next();
  }

  const priceChanged = this.isModified('price');
  const statusChanged = this.isModified('status');

  this._previousNotificationState = this._previousNotificationState || {};

  if (!priceChanged && !statusChanged) {
    return next();
  }

  try {
    const previous = await this.constructor
      .findById(this._id)
      .select('price status lastNotificationSnapshot');

    if (!previous) {
      return next();
    }

    const events = [];

    if (previous) {
      this._previousNotificationState.price = previous.price;
      this._previousNotificationState.status = previous.status;
      this._previousNotificationState.snapshot = previous.lastNotificationSnapshot;
    }

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

adSchema.post('save', async function (doc, next) {
  try {
    if (doc.isNew) {
      return next();
    }

    const previousPrice = doc._previousNotificationState?.price;
    const previousStatus = doc._previousNotificationState?.status;

    const priceChanged = typeof previousPrice === 'number' && previousPrice !== doc.price;
    const statusChanged =
      typeof previousStatus === 'string' && previousStatus !== doc.status;

    if (!priceChanged && !statusChanged) {
      return next();
    }

    await AdChange.create({
      adId: doc._id,
      oldPrice: priceChanged ? previousPrice : undefined,
      newPrice: priceChanged ? doc.price : undefined,
      oldStatus: statusChanged ? previousStatus : undefined,
      newStatus: statusChanged ? doc.status : undefined,
    });

    await doc.constructor.updateOne(
      { _id: doc._id },
      {
        lastNotificationSnapshot: {
          price: doc.price,
          status: doc.status,
          updatedAt: new Date(),
        },
      }
    );

    return next();
  } catch (error) {
    return next(error);
  }
});

// Составные индексы
adSchema.index({ status: 1, createdAt: -1 });
adSchema.index({ seasonCode: 1, status: 1 });
adSchema.index({ 'location.lat': 1, 'location.lng': 1 });
adSchema.index({ geo: '2dsphere' });

function resolveCoordinatesFromLocation(location) {
  if (!location) return null;

  if (
    location.lat != null &&
    location.lng != null &&
    Number.isFinite(Number(location.lat)) &&
    Number.isFinite(Number(location.lng))
  ) {
    return { lat: Number(location.lat), lng: Number(location.lng) };
  }

  if (
    location.geo &&
    Array.isArray(location.geo.coordinates) &&
    location.geo.coordinates.length === 2
  ) {
    const [lng, lat] = location.geo.coordinates;
    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      return { lat: Number(lat), lng: Number(lng) };
    }
  }

  return null;
}

module.exports = mongoose.model('Ad', adSchema);
