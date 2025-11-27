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
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SellerProfile',
      index: true,
    },
    source: {
      type: String,
      enum: ['organic', 'boost', 'banner', 'campaign', 'search', 'recommendation'],
      default: 'organic',
      index: true,
    },
    campaignCode: {
      type: String,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'view',             // просмотр товара
        'store_view',       // просмотр магазина
        'contact',          // клик на контакты
        'contact_click',    // клик на контакты (alias)
        'favorite',         // добавление в избранное
        'unfavorite',       // удаление из избранного
        'search_hit',       // товар показан в выдаче
        'price_view',       // просмотр цены
        'share',            // поделились товаром
        'message',          // написали сообщение
        'call',             // позвонили
        'call_click',       // клик на звонок (alias)
        'open_telegram',    // открыл Telegram
        'open_store',       // открыл витрину магазина
        'open_campaign',    // открыл витрину кампании
        'impression',       // показ в ленте
        'click',            // общий клик
      ],
      required: true,
      index: true,
    },
    geo: GeoPointSchema,
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    priceAtMoment: {
      type: Number,
      default: null,
    },
    city: {
      type: String,
      trim: true,
    },
    region: {
      type: String,
      trim: true,
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
analyticsEventSchema.index({ storeId: 1, type: 1, createdAt: -1 });
analyticsEventSchema.index({ storeId: 1, source: 1, createdAt: -1 });
analyticsEventSchema.index({ campaignCode: 1, createdAt: -1 });
analyticsEventSchema.index({ campaignCode: 1, type: 1, createdAt: -1 });
analyticsEventSchema.index({ campaignCode: 1, storeId: 1, createdAt: -1 });
analyticsEventSchema.index({ campaignCode: 1, source: 1, createdAt: -1 });
analyticsEventSchema.index({ city: 1, campaignCode: 1, createdAt: -1 });
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

analyticsEventSchema.statics.getCampaignOverview = async function(campaignCode, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        campaignCode,
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

  const result = {
    totalViews: 0,
    totalContactClicks: 0,
    totalFavorites: 0,
    totalShares: 0,
    totalImpressions: 0,
  };

  stats.forEach(stat => {
    if (stat._id === 'view' || stat._id === 'store_view') {
      result.totalViews += stat.count;
    } else if (stat._id === 'contact' || stat._id === 'contact_click') {
      result.totalContactClicks += stat.count;
    } else if (stat._id === 'favorite') {
      result.totalFavorites += stat.count;
    } else if (stat._id === 'share') {
      result.totalShares += stat.count;
    } else if (stat._id === 'impression') {
      result.totalImpressions += stat.count;
    }
  });

  result.ctrContacts = result.totalViews > 0 
    ? (result.totalContactClicks / result.totalViews * 100).toFixed(2) 
    : 0;

  return result;
};

analyticsEventSchema.statics.getCampaignSourceBreakdown = async function(campaignCode, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        campaignCode,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$source',
        views: { 
          $sum: { $cond: [{ $in: ['$type', ['view', 'store_view']] }, 1, 0] } 
        },
        contactClicks: { 
          $sum: { $cond: [{ $in: ['$type', ['contact', 'contact_click']] }, 1, 0] } 
        },
      },
    },
    {
      $project: {
        source: '$_id',
        views: 1,
        contactClicks: 1,
        _id: 0,
      },
    },
    { $sort: { views: -1 } },
  ]);
};

analyticsEventSchema.statics.getCampaignTopStores = async function(campaignCode, days = 30, limit = 5) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        campaignCode,
        storeId: { $ne: null },
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$storeId',
        views: { 
          $sum: { $cond: [{ $in: ['$type', ['view', 'store_view']] }, 1, 0] } 
        },
        contactClicks: { 
          $sum: { $cond: [{ $in: ['$type', ['contact', 'contact_click']] }, 1, 0] } 
        },
      },
    },
    { $sort: { views: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'sellerprofiles',
        localField: '_id',
        foreignField: '_id',
        as: 'store',
      },
    },
    { $unwind: { path: '$store', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        storeId: '$_id',
        storeName: '$store.shopName',
        views: 1,
        contactClicks: 1,
        _id: 0,
      },
    },
  ]);
};

analyticsEventSchema.statics.getCampaignTopAds = async function(campaignCode, days = 30, limit = 5) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        campaignCode,
        adId: { $ne: null },
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$adId',
        views: { 
          $sum: { $cond: [{ $in: ['$type', ['view', 'store_view']] }, 1, 0] } 
        },
        contactClicks: { 
          $sum: { $cond: [{ $in: ['$type', ['contact', 'contact_click']] }, 1, 0] } 
        },
        favorites: { 
          $sum: { $cond: [{ $eq: ['$type', 'favorite'] }, 1, 0] } 
        },
      },
    },
    { $sort: { views: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'ads',
        localField: '_id',
        foreignField: '_id',
        as: 'ad',
      },
    },
    { $unwind: { path: '$ad', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        adId: '$_id',
        title: '$ad.title',
        price: '$ad.price',
        storeName: '$ad.sellerName',
        views: 1,
        contactClicks: 1,
        favorites: 1,
        _id: 0,
      },
    },
  ]);
};

analyticsEventSchema.statics.getCampaignDaily = async function(campaignCode, metric = 'views', days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const typeFilter = metric === 'views' 
    ? ['view', 'store_view'] 
    : metric === 'contactClicks' 
      ? ['contact', 'contact_click'] 
      : [metric];

  return this.aggregate([
    {
      $match: {
        campaignCode,
        type: { $in: typeFilter },
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        value: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        date: '$_id',
        value: 1,
        _id: 0,
      },
    },
  ]);
};

analyticsEventSchema.statics.getCampaignGeo = async function(campaignCode, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        campaignCode,
        createdAt: { $gte: startDate },
        $or: [
          { city: { $ne: null } },
          { geo: { $ne: null } },
        ],
      },
    },
    {
      $group: {
        _id: { city: '$city', region: '$region' },
        views: { 
          $sum: { $cond: [{ $in: ['$type', ['view', 'store_view']] }, 1, 0] } 
        },
        contactClicks: { 
          $sum: { $cond: [{ $in: ['$type', ['contact', 'contact_click']] }, 1, 0] } 
        },
        geoPoints: { 
          $push: { 
            $cond: [{ $ne: ['$geo', null] }, '$geo', '$$REMOVE'] 
          } 
        },
      },
    },
    {
      $project: {
        city: '$_id.city',
        region: '$_id.region',
        views: 1,
        contactClicks: 1,
        geoPointsCount: { $size: '$geoPoints' },
        _id: 0,
      },
    },
    { $sort: { views: -1 } },
  ]);
};

const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);

export default AnalyticsEvent;
