import mongoose from 'mongoose';

const geoEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  telegramId: {
    type: Number,
    index: true
  },
  
  type: {
    type: String,
    enum: ['search', 'empty_search', 'view', 'favorite', 'contact', 'category_open', 'click'],
    required: true,
    index: true
  },
  
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  
  geoHash: {
    type: String,
    index: true
  },
  
  cityCode: {
    type: String,
    index: true
  },
  
  payload: {
    query: String,
    categoryId: String,
    subcategoryId: String,
    adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad' },
    resultsCount: Number,
    priceRange: {
      min: Number,
      max: Number
    }
  },
  
  sessionId: String,
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 2592000 // 30 days TTL
  }
}, {
  timestamps: false
});

geoEventSchema.index({ location: '2dsphere' });
geoEventSchema.index({ type: 1, createdAt: -1 });
geoEventSchema.index({ geoHash: 1, type: 1, createdAt: -1 });
geoEventSchema.index({ 'payload.categoryId': 1, createdAt: -1 });

geoEventSchema.statics.logEvent = async function(eventData) {
  const ngeohash = await import('ngeohash');
  
  const { lat, lng, ...rest } = eventData;
  
  const event = new this({
    ...rest,
    location: {
      type: 'Point',
      coordinates: [lng, lat]
    },
    geoHash: ngeohash.default.encode(lat, lng, 6)
  });
  
  return event.save();
};

geoEventSchema.statics.getDemandHeatmap = async function(options) {
  const { lat, lng, radiusKm = 10, hours = 24 } = options;
  
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const events = await this.aggregate([
    {
      $match: {
        location: {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusKm / 6378.1]
          }
        },
        'location.coordinates': { $exists: true, $ne: null },
        geoHash: { $exists: true, $ne: null },
        type: { $in: ['search', 'empty_search', 'category_open', 'view'] },
        createdAt: { $gte: since }
      }
    },
    {
      $group: {
        _id: '$geoHash',
        count: { $sum: 1 },
        searches: { $sum: { $cond: [{ $eq: ['$type', 'search'] }, 1, 0] } },
        emptySearches: { $sum: { $cond: [{ $eq: ['$type', 'empty_search'] }, 1, 0] } },
        views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
        topQueries: { $push: '$payload.query' },
        topCategories: { $push: '$payload.categoryId' },
        avgLat: { $avg: { $arrayElemAt: ['$location.coordinates', 1] } },
        avgLng: { $avg: { $arrayElemAt: ['$location.coordinates', 0] } }
      }
    },
    {
      $match: {
        avgLat: { $ne: null, $type: 'number' },
        avgLng: { $ne: null, $type: 'number' }
      }
    },
    {
      $project: {
        geoHash: '$_id',
        count: 1,
        searches: 1,
        emptySearches: 1,
        views: 1,
        intensity: { $add: ['$count', { $multiply: ['$emptySearches', 2] }] },
        lat: '$avgLat',
        lng: '$avgLng'
      }
    },
    { $sort: { intensity: -1 } },
    { $limit: 500 }
  ]);
  
  return events.filter(e => e.lat != null && e.lng != null && !isNaN(e.lat) && !isNaN(e.lng));
};

geoEventSchema.statics.getTrendingSearches = async function(options) {
  const { lat, lng, radiusKm = 10, hours = 24, limit = 10 } = options;
  
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const trends = await this.aggregate([
    {
      $match: {
        location: {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusKm / 6378.1]
          }
        },
        type: { $in: ['search', 'empty_search'] },
        'payload.query': { $exists: true, $ne: '' },
        createdAt: { $gte: since }
      }
    },
    {
      $group: {
        _id: { $toLower: '$payload.query' },
        count: { $sum: 1 },
        emptyCount: { $sum: { $cond: [{ $eq: ['$type', 'empty_search'] }, 1, 0] } },
        lastSearched: { $max: '$createdAt' }
      }
    },
    {
      $project: {
        query: '$_id',
        count: 1,
        emptyCount: 1,
        demandScore: { $add: ['$count', { $multiply: ['$emptyCount', 1.5] }] },
        lastSearched: 1
      }
    },
    { $sort: { demandScore: -1 } },
    { $limit: limit }
  ]);
  
  return trends;
};

const GeoEvent = mongoose.model('GeoEvent', geoEventSchema);

export default GeoEvent;
