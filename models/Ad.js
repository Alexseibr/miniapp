const mongoose = require('mongoose');
const NotificationEvent = require('./NotificationEvent');

const LocationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
    },
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
      enum: ['draft', 'active', 'sold', 'archived'],
      default: 'active',
      index: true,
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
    location: {
      type: LocationSchema,
      index: '2dsphere',
    },
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

// Автоматический расчет validUntil при создании
adSchema.pre('save', function (next) {
  if (this.isNew && !this.validUntil) {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (this.lifetimeDays || 30));
    this.validUntil = validUntil;
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

module.exports = mongoose.model('Ad', adSchema);
