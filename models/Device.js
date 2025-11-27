import mongoose from 'mongoose';

/**
 * GeoJSON Point Schema для геолокации устройства
 */
const GeoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere',
    },
  },
  { _id: false }
);

/**
 * Device Schema - мобильные устройства пользователей
 * 
 * Используется для:
 * - Регистрации push-токенов (FCM/APNs)
 * - Отслеживания геолокации для таргетированных уведомлений
 * - Fallback на Telegram при недоступности push
 */
const deviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    deviceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    
    platform: {
      type: String,
      enum: ['ios', 'android', 'web'],
      required: true,
    },
    
    pushToken: {
      type: String,
      default: null,
      trim: true,
    },
    
    pushEnabled: {
      type: Boolean,
      default: true,
    },
    
    lastGeo: {
      type: GeoPointSchema,
      default: null,
    },
    
    lastSeenAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    
    // Дополнительная информация об устройстве
    appVersion: {
      type: String,
      default: null,
    },
    
    osVersion: {
      type: String,
      default: null,
    },
    
    // Флаг для пометки невалидных токенов
    tokenInvalid: {
      type: Boolean,
      default: false,
    },
    
    tokenInvalidReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Составной уникальный индекс: один deviceId на пользователя
deviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

// Индекс для поиска устройств с валидными push-токенами
deviceSchema.index({ pushEnabled: 1, tokenInvalid: 1 });

// Гео-индекс для поиска устройств в радиусе
deviceSchema.index({ lastGeo: '2dsphere' });

/**
 * Обновить или создать устройство
 */
deviceSchema.statics.upsertDevice = async function(userId, deviceData) {
  const { deviceId, platform, pushToken, geo, appVersion, osVersion } = deviceData;
  
  const update = {
    platform,
    pushToken: pushToken || null,
    pushEnabled: true,
    tokenInvalid: false,
    tokenInvalidReason: null,
    lastSeenAt: new Date(),
  };
  
  if (geo && geo.lat != null && geo.lng != null) {
    update.lastGeo = {
      type: 'Point',
      coordinates: [geo.lng, geo.lat], // MongoDB format: [lng, lat]
    };
  }
  
  if (appVersion) update.appVersion = appVersion;
  if (osVersion) update.osVersion = osVersion;
  
  return this.findOneAndUpdate(
    { userId, deviceId },
    { $set: update },
    { upsert: true, new: true }
  );
};

/**
 * Обновить геолокацию устройства
 */
deviceSchema.statics.updateGeo = async function(userId, deviceId, geo) {
  if (!geo || geo.lat == null || geo.lng == null) {
    throw new Error('Invalid geo coordinates');
  }
  
  return this.findOneAndUpdate(
    { userId, deviceId },
    {
      $set: {
        lastGeo: {
          type: 'Point',
          coordinates: [geo.lng, geo.lat],
        },
        lastSeenAt: new Date(),
      },
    },
    { new: true }
  );
};

/**
 * Найти устройства пользователей в радиусе от точки
 * 
 * @param {Object} center - { lat, lng }
 * @param {Number} radiusKm - радиус в километрах
 * @param {Object} options - { excludeUserIds, limit }
 */
deviceSchema.statics.findDevicesInRadius = async function(center, radiusKm, options = {}) {
  const { excludeUserIds = [], limit = 1000 } = options;
  
  const query = {
    lastGeo: {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [center.lng, center.lat],
        },
        $maxDistance: radiusKm * 1000, // MongoDB uses meters
      },
    },
    pushEnabled: true,
    tokenInvalid: { $ne: true },
  };
  
  if (excludeUserIds.length > 0) {
    query.userId = { $nin: excludeUserIds };
  }
  
  return this.find(query)
    .limit(limit)
    .populate('userId', 'telegramId username firstName')
    .lean();
};

/**
 * Найти все активные устройства пользователя
 */
deviceSchema.statics.findUserDevices = async function(userId) {
  return this.find({
    userId,
    pushEnabled: true,
    tokenInvalid: { $ne: true },
  }).lean();
};

/**
 * Пометить токен как невалидный
 */
deviceSchema.statics.markTokenInvalid = async function(deviceId, reason) {
  return this.findOneAndUpdate(
    { deviceId },
    {
      $set: {
        tokenInvalid: true,
        tokenInvalidReason: reason,
        pushEnabled: false,
      },
    },
    { new: true }
  );
};

const Device = mongoose.model('Device', deviceSchema);

export default Device;
