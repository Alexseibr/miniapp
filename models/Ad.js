import mongoose from 'mongoose';
import NotificationEvent from './NotificationEvent.js';
import AdChange from './AdChange.js';
import AdPriceSnapshot from './AdPriceSnapshot.js';
import CategoryWordStatsService from '../services/CategoryWordStatsService.js';

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

/**
 * GeoJSON Point Schema для геолокации объявлений
 * Используется для geo-поиска с помощью MongoDB 2dsphere индекса
 * 
 * @property {String} type - Тип GeoJSON, всегда 'Point'
 * @property {Number[]} coordinates - Массив [longitude, latitude] (долгота, широта)
 * 
 * Важно: порядок координат [lng, lat], а не [lat, lng]!
 * Пример: [27.5615, 53.9045] для Минска (долгота 27.56°, широта 53.90°)
 */
const GeoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      index: '2dsphere', // Геопространственный индекс для быстрого поиска
      default: undefined,
    },
  },
  { _id: false }
);

/**
 * Location Schema - содержит координаты объявления в разных форматах
 * 
 * @property {Number} lat - Широта (для удобства, дублирует geo.coordinates[1])
 * @property {Number} lng - Долгота (для удобства, дублирует geo.coordinates[0])
 * @property {GeoPointSchema} geo - GeoJSON Point для MongoDB geo-запросов
 */
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
      default: 'RUB',
      trim: true,
    },
    unitType: {
      type: String,
      enum: ['kg', 'g', 'piece', 'liter', 'pack', 'jar', 'bunch', 'bag', null],
      default: null,
    },
    quantity: {
      type: Number,
      default: null,
      min: 0,
    },
    pricePerKg: {
      type: Number,
      default: null,
      min: 0,
    },
    isFarmerAd: {
      type: Boolean,
      default: false,
      index: true,
    },
    deliveryFromFarm: {
      type: Boolean,
      default: false,
    },
    canDeliver: {
      type: Boolean,
      default: false,
    },
    farmLocation: {
      type: String,
      default: null,
      trim: true,
    },
    harvestDate: {
      type: Date,
      default: null,
    },
    productionDate: {
      type: Date,
      default: null,
    },
    isOrganic: {
      type: Boolean,
      default: false,
    },
    minQuantity: {
      type: Number,
      default: null,
      min: 0,
    },
    photos: [{
      type: String,
      trim: true,
    }],
    previewUrl: {
      type: String,
      trim: true,
      default: null,
    },
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
    city: {
      type: String,
      trim: true,
      default: null,
    },
    cityCode: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      default: null,
    },
    geoLabel: {
      type: String,
      trim: true,
      default: null,
    },
    contactType: {
      type: String,
      enum: ['telegram_phone', 'telegram_username', 'instagram', 'none'],
      default: 'none',
    },
    contactPhone: {
      type: String,
      trim: true,
      default: null,
    },
    contactUsername: {
      type: String,
      trim: true,
      default: null,
    },
    contactInstagram: {
      type: String,
      trim: true,
      default: null,
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
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SellerProfile',
      index: true,
      default: null,
    },
    shopProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SellerProfile',
      index: true,
      default: null,
    },
    hasDelivery: {
      type: Boolean,
      default: false,
      index: true,
    },
    deliveryPriceOverride: {
      type: Number,
      min: 0,
      default: null,
    },
    maxDailyQuantity: {
      type: Number,
      min: 0,
      default: null,
    },
    availableQuantity: {
      type: Number,
      min: 0,
      default: null,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'sold', 'archived', 'hidden', 'expired', 'scheduled'],
      default: 'active',
      index: true,
    },
    
    // === Lifecycle Management ===
    lifetimeType: {
      type: String,
      enum: ['perishable_daily', 'fast', 'medium', 'long'],
      default: 'fast',
      index: true,
    },
    repeatMode: {
      type: String,
      enum: ['none', 'daily'],
      default: 'none',
    },
    repeatUntil: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    scheduledAt: {
      type: Date,
      default: null,
      index: true,
    },
    isSoldOut: {
      type: Boolean,
      default: false,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ad',
      default: null,
    },
    isTemplate: {
      type: Boolean,
      default: false,
      index: true,
    },
    reminderSentAt: {
      type: Date,
      default: null,
    },
    midLifeReminderSent: {
      type: Boolean,
      default: false,
    },
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'scheduled'],
      default: 'pending',
      index: true,
    },
    publishAt: {
      type: Date,
      default: null,
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
    viewsTotal: {
      type: Number,
      default: 0,
    },
    viewsToday: {
      type: Number,
      default: 0,
    },
    impressionsTotal: {
      type: Number,
      default: 0,
    },
    impressionsToday: {
      type: Number,
      default: 0,
    },
    contactClicks: {
      type: Number,
      default: 0,
    },
    contactRevealCount: {
      type: Number,
      default: 0,
    },
    firstShownAt: {
      type: Date,
      default: null,
    },
    lastShownAt: {
      type: Date,
      default: null,
    },
    lastViewedAt: {
      type: Date,
      default: null,
    },
    favoritesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // === Premium/Monetization Features ===
    isPremiumCard: {
      type: Boolean,
      default: false,
      index: true,
    },
    premiumBadge: {
      type: String,
      enum: ['none', 'gold', 'purple', 'top'],
      default: 'none',
    },
    boostLevel: {
      type: Number,
      default: 0,
      min: 0,
    },
    boostedAt: {
      type: Date,
      default: null,
      index: true,
    },
    isShowcased: {
      type: Boolean,
      default: false,
      index: true,
    },
    showcasePosition: {
      type: Number,
      default: null,
    },
    premiumExpiresAt: {
      type: Date,
      default: null,
    },
    
    // === Rating Summary ===
    ratingSummary: {
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
      lastRatedAt: {
        type: Date,
        default: null,
      },
    },
    flags: {
      suspicious: {
        type: Boolean,
        default: false,
        index: true,
      },
      suspiciousReason: {
        type: String,
        enum: ['low_rating', 'fraud_reports', 'manual', null],
        default: null,
      },
      markedAt: {
        type: Date,
        default: null,
      },
    },
    
    needsCategoryReview: {
      type: Boolean,
      default: false,
      index: true,
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

    // === Нормализованные поля для сравнения цен ===
    
    // Электроника / Смартфоны
    brand: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      default: null,
    },
    model: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      default: null,
    },
    storageGb: {
      type: Number,
      min: 0,
      default: null,
    },
    ramGb: {
      type: Number,
      min: 0,
      default: null,
    },

    // Автомобили
    carMake: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      default: null,
    },
    carModel: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      default: null,
    },
    carYear: {
      type: Number,
      min: 1900,
      max: 2100,
      index: true,
      default: null,
    },
    carEngineVolume: {
      type: Number,
      min: 0,
      default: null,
    },
    carTransmission: {
      type: String,
      enum: ['auto', 'manual', null],
      default: null,
    },

    // Недвижимость
    realtyType: {
      type: String,
      enum: ['apartment', 'house', 'room', 'land', 'commercial', null],
      default: null,
    },
    realtyRooms: {
      type: Number,
      min: 0,
      default: null,
    },
    realtyAreaTotal: {
      type: Number,
      min: 0,
      default: null,
    },
    realtyCity: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      default: null,
    },
    realtyDistrict: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      default: null,
    },
    pricePerSqm: {
      type: Number,
      min: 0,
      index: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Геопространственный индекс для эффективного поиска объявлений по координатам
// Используется в endpoints: /api/ads/search (с $geoNear), /api/ads/nearby, /api/ads/live-spots
adSchema.index({ 'location.geo': '2dsphere' });

// Автоматический расчет validUntil при создании и pricePerSqm для недвижимости
adSchema.pre('save', function (next) {
  if (this.isNew && !this.validUntil) {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (this.lifetimeDays || 30));
    this.validUntil = validUntil;
  }

  // Автоматический расчет pricePerSqm для недвижимости
  if (this.realtyAreaTotal && this.realtyAreaTotal > 0 && this.price && this.price > 0) {
    this.pricePerSqm = Math.round((this.price / this.realtyAreaTotal) * 100) / 100;
  } else if (this.isModified('price') || this.isModified('realtyAreaTotal')) {
    // Сбрасываем если данные неполные
    if (!this.realtyAreaTotal || !this.price) {
      this.pricePerSqm = null;
    }
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

    // Инвалидация кэша цен при изменении цены
    if (priceChanged) {
      try {
        await AdPriceSnapshot.deleteOne({ adId: doc._id });
      } catch (err) {
        console.warn('[Ad] Failed to invalidate price cache:', err.message);
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
});

adSchema.post('save', async function (doc, next) {
  if (!doc.categoryId || !doc.title) {
    return next();
  }

  const validStatuses = ['active', 'pending', 'draft'];
  if (!validStatuses.includes(doc.status)) {
    return next();
  }

  try {
    await CategoryWordStatsService.updateStatsForAd(doc);
  } catch (error) {
    console.warn('[Ad] Failed to update category word stats:', error.message);
  }

  return next();
});

adSchema.pre('save', async function (next) {
  if (!this.subcategoryId) {
    return next();
  }

  const subcategoryChanged = this.isModified('subcategoryId');
  const isNew = this.isNew;
  const needsReviewChanged = this.isModified('needsCategoryReview');
  
  if (!subcategoryChanged && !isNew && needsReviewChanged) {
    return next();
  }

  try {
    const Category = mongoose.model('Category');
    const subcategory = await Category.findOne({ slug: this.subcategoryId }).select('isOther').lean();
    
    if (subcategory && subcategory.isOther === true) {
      this.needsCategoryReview = true;
    } else if (subcategoryChanged || isNew) {
      this.needsCategoryReview = false;
    }
  } catch (error) {
    console.warn('[Ad] Failed to check isOther category:', error.message);
  }

  return next();
});

// Составные индексы
adSchema.index({ status: 1, createdAt: -1 });
adSchema.index({ seasonCode: 1, status: 1 });
adSchema.index({ 'location.lat': 1, 'location.lng': 1 });
adSchema.index({ geo: '2dsphere' });

// Индексы для сравнения цен
// Электроника: brand + model + storageGb
adSchema.index({ status: 1, categoryId: 1, brand: 1, model: 1, storageGb: 1, createdAt: -1 });
// Автомобили: carMake + carModel + carYear
adSchema.index({ status: 1, categoryId: 1, carMake: 1, carModel: 1, carYear: 1, createdAt: -1 });
// Недвижимость: realtyType + realtyCity + realtyDistrict
adSchema.index({ status: 1, categoryId: 1, realtyType: 1, realtyCity: 1, realtyDistrict: 1, createdAt: -1 });
// Общий по категории + подкатегории
adSchema.index({ status: 1, categoryId: 1, subcategoryId: 1, createdAt: -1 });

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

export default mongoose.model('Ad', adSchema);
