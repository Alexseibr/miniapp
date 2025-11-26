import mongoose from 'mongoose';

const GeoPointSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
);

const analyticsEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ad',
      index: true,
    },
    type: {
      type: String,
      enum: [
        'view',           // просмотр товара
        'store_view',     // просмотр магазина
        'contact',        // клик на контакты
        'favorite',       // добавление в избранное
        'unfavorite',     // удаление из избранного
        'search_hit',     // товар показан в выдаче
        'price_view',     // просмотр цены
        'share',          // поделились товаром
        'message',        // написали сообщение
        'call',           // позвонили
      ],
      required: true,
      index: true,
    },
    geo: GeoPointSchema,
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    sessionId: String,
    platform: {
      type: String,
      enum: ['telegram', 'web', 'mobile'],
      default: 'telegram',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

analyticsEventSchema.index({ sellerId: 1, type: 1, createdAt: -1 });
analyticsEventSchema.index({ sellerId: 1, adId: 1, createdAt: -1 });
analyticsEventSchema.index({ adId: 1, type: 1, createdAt: -1 });
analyticsEventSchema.index({ createdAt: -1 });
analyticsEventSchema.index({ 'geo.lat': 1, 'geo.lng': 1 });

analyticsEventSchema.statics.trackEvent = async function(eventData) {
  try {
    const event = new this(eventData);
    await event.save();
    return event;
  } catch (error) {
    console.error('[AnalyticsEvent] Error tracking event:', error);
    throw error;
  }
};

analyticsEventSchema.statics.getSellerStats = async function(sellerId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        sellerId: new mongoose.Types.ObjectId(sellerId),
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
      },
    },
  ]);

  return stats.reduce((acc, stat) => {
    acc[stat._id] = stat.count;
    return acc;
  }, {});
};

analyticsEventSchema.statics.getViewsTimeline = async function(sellerId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        sellerId: new mongoose.Types.ObjectId(sellerId),
        type: { $in: ['view', 'store_view'] },
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          type: '$type',
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { '_id.date': 1 },
    },
  ]);
};

analyticsEventSchema.statics.getTopProducts = async function(sellerId, limit = 10, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        sellerId: new mongoose.Types.ObjectId(sellerId),
        type: 'view',
        adId: { $ne: null },
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$adId',
        views: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
      },
    },
    {
      $project: {
        _id: 1,
        views: 1,
        uniqueViews: { $size: '$uniqueUsers' },
      },
    },
    { $sort: { views: -1 } },
    { $limit: limit },
  ]);
};

analyticsEventSchema.statics.getGeoHeatmap = async function(sellerId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        sellerId: new mongoose.Types.ObjectId(sellerId),
        geo: { $ne: null },
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          lat: { $round: ['$geo.lat', 2] },
          lng: { $round: ['$geo.lng', 2] },
        },
        count: { $sum: 1 },
        types: { $push: '$type' },
      },
    },
    {
      $project: {
        lat: '$_id.lat',
        lng: '$_id.lng',
        count: 1,
        intensity: { $min: [{ $divide: ['$count', 10] }, 1] },
      },
    },
  ]);
};

const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);

export default AnalyticsEvent;
