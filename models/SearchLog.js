import mongoose from 'mongoose';
import ngeohash from 'ngeohash';

const FARMER_KEYWORDS = [
  'картошка', 'картофель', 'морковь', 'свекла', 'лук', 'капуста',
  'яблоки', 'груши', 'клубника', 'малина', 'черника', 'смородина',
  'вишня', 'черешня', 'слива', 'абрикос', 'персик', 'виноград',
  'мёд', 'мед', 'яйца', 'молоко', 'творог', 'сыр', 'сметана', 'масло',
  'зелень', 'укроп', 'петрушка', 'салат', 'шпинат',
  'выпечка', 'хлеб', 'пироги', 'булки', 'торт', 'кулич',
  'огурцы', 'помидоры', 'томаты', 'перец', 'баклажаны', 'кабачки',
  'тыква', 'арбуз', 'дыня', 'чеснок', 'редис', 'редька',
  'грибы', 'мясо', 'свинина', 'говядина', 'курица', 'кролик',
  'рыба', 'сало', 'колбаса', 'соленья', 'варенье', 'компот',
];

const searchLogSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    trim: true,
  },
  normalizedQuery: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  normalizedTokens: [{
    type: String,
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  telegramId: {
    type: Number,
    index: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  },
  geoHash: {
    type: String,
    index: true,
  },
  regionId: {
    type: String,
    index: true,
  },
  citySlug: {
    type: String,
    default: null,
  },
  resultsCount: {
    type: Number,
    default: 0,
  },
  detectedCategoryId: {
    type: String,
    default: null,
    index: true,
  },
  matchedFarmerKeywords: [{
    type: String,
  }],
  isFarmerSearch: {
    type: Boolean,
    default: false,
    index: true,
  },
  alertCreated: {
    type: Boolean,
    default: false,
  },
  radiusKm: {
    type: Number,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

searchLogSchema.index({ location: '2dsphere' });
searchLogSchema.index({ normalizedQuery: 1, geoHash: 1 });
searchLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
searchLogSchema.index({ isFarmerSearch: 1, createdAt: -1 });
searchLogSchema.index({ matchedFarmerKeywords: 1, createdAt: -1 });
searchLogSchema.index({ regionId: 1, createdAt: -1 });

searchLogSchema.statics.FARMER_KEYWORDS = FARMER_KEYWORDS;

searchLogSchema.statics.normalizeQueryToTokens = function(query) {
  if (!query) return [];
  return query
    .toLowerCase()
    .replace(/[^\wа-яё\s]/gi, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1);
};

searchLogSchema.statics.findFarmerKeywords = function(tokens) {
  const matched = [];
  for (const keyword of FARMER_KEYWORDS) {
    if (tokens.some(t => t.includes(keyword) || keyword.includes(t))) {
      matched.push(keyword);
    }
  }
  return [...new Set(matched)];
};

searchLogSchema.statics.logFarmerSearch = async function(data) {
  const { query, telegramId, location, lat, lng, radiusKm, resultsCount = 0, citySlug } = data;
  
  const normalizedTokens = this.normalizeQueryToTokens(query);
  const matchedFarmerKeywords = this.findFarmerKeywords(normalizedTokens);
  const isFarmerSearch = matchedFarmerKeywords.length > 0;
  
  if (!isFarmerSearch) return null;
  
  let geoHash = null;
  let regionId = null;
  let geoLocation = location;
  
  let latitude = lat || location?.lat;
  let longitude = lng || location?.lng;
  
  if (!latitude && !longitude && location?.coordinates?.length === 2) {
    longitude = location.coordinates[0];
    latitude = location.coordinates[1];
  }
  
  if (latitude && longitude) {
    geoHash = ngeohash.encode(latitude, longitude, 5);
    regionId = geoHash.substring(0, 4);
    
    if (!geoLocation) {
      geoLocation = {
        type: 'Point',
        coordinates: [longitude, latitude],
      };
    }
  }
  
  return this.create({
    query,
    normalizedQuery: query.toLowerCase().trim(),
    normalizedTokens,
    telegramId,
    location: geoLocation,
    geoHash,
    regionId,
    citySlug,
    matchedFarmerKeywords,
    isFarmerSearch,
    radiusKm,
    resultsCount,
  });
};

searchLogSchema.statics.getHotFarmerProducts = async function(options = {}) {
  const { regionId, hours = 24, limit = 10 } = options;
  
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const match = {
    isFarmerSearch: true,
    createdAt: { $gte: since },
  };
  
  if (regionId) {
    match.regionId = regionId;
  }
  
  const results = await this.aggregate([
    { $match: match },
    { $unwind: '$matchedFarmerKeywords' },
    {
      $group: {
        _id: '$matchedFarmerKeywords',
        searchCount: { $sum: 1 },
        uniqueUsers: { $addToSet: '$telegramId' },
      },
    },
    {
      $project: {
        keyword: '$_id',
        searchCount: 1,
        uniqueUsersCount: { $size: '$uniqueUsers' },
      },
    },
    { $sort: { searchCount: -1 } },
    { $limit: limit },
  ]);
  
  return results;
};

const SearchLog = mongoose.model('SearchLog', searchLogSchema);

export default SearchLog;
