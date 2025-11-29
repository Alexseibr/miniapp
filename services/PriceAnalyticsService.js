import Ad from '../models/Ad.js';
import AdPriceSnapshot from '../models/AdPriceSnapshot.js';
import Category from '../models/Category.js';

const DEFAULT_WINDOWS = [7, 30, 90];
const MIN_SAMPLE_SIZE = 5;
const SNAPSHOT_TTL_HOURS = 6;

const ELECTRONICS_CATEGORIES = ['elektronika'];
const ELECTRONICS_SUBCATEGORIES = [
  'telefony-planshety', 
  'noutbuki-kompyutery', 
  'tv-foto-video', 
  'audio-tehnika',
  'igry-igrovye-pristavki',
  'tovary-dlya-kompyutera',
];

const CARS_CATEGORIES = ['avto-zapchasti'];
const CARS_SUBCATEGORIES = [
  'legkovye-avtomobili', 
  'gruzovye-avtomobili', 
  'mototehnika', 
  'spetstekhnika',
];

const REALTY_CATEGORIES = ['nedvizhimost'];
const REALTY_SUBCATEGORIES = [
  'kvartiry', 
  'komnaty', 
  'doma-dachi-kottedzhi', 
  'uchastki',
  'garazhi-mashinomesta',
  'kommercheskaya-nedvizhimost',
];

function calculateMedian(prices) {
  if (!prices || prices.length === 0) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateMarketLevel(diffPercent) {
  if (diffPercent === null || diffPercent === undefined) return 'unknown';
  if (diffPercent <= -5) return 'below';
  if (diffPercent >= 10) return 'above';
  return 'fair';
}

function generateLabels(stats, currentPrice) {
  if (!stats || !stats.hasMarketData) {
    return null;
  }

  const { diffPercent, avgPrice, minPrice, maxPrice, marketLevel } = stats;
  
  let messageForSeller = '';
  if (marketLevel === 'below') {
    messageForSeller = `Ваша цена ниже средней по рынку на ${Math.abs(diffPercent).toFixed(0)}%`;
  } else if (marketLevel === 'above') {
    messageForSeller = `Ваша цена выше средней по рынку на ${diffPercent.toFixed(0)}%`;
  } else {
    messageForSeller = 'Ваша цена соответствует рынку';
  }

  const recommendedFrom = avgPrice ? Math.round(avgPrice * 0.95) : null;
  const recommendedTo = avgPrice ? Math.round(avgPrice * 1.05) : null;

  return {
    marketLevel,
    messageForSeller,
    recommendedPriceRange: recommendedFrom && recommendedTo ? {
      from: recommendedFrom,
      to: recommendedTo,
    } : null,
  };
}

async function collectWithDynamicWindow(baseMatch, excludeId, windows = DEFAULT_WINDOWS, minCount = MIN_SAMPLE_SIZE) {
  for (const days of windows) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const match = {
      ...baseMatch,
      createdAt: { $gte: dateThreshold },
      status: 'active',
      moderationStatus: 'approved',
      price: { $gt: 0 },
    };

    if (excludeId) {
      match._id = { $ne: excludeId };
    }

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          prices: { $push: '$price' },
        },
      },
    ];

    const result = await Ad.aggregate(pipeline);

    if (result.length > 0 && result[0].count >= minCount) {
      const data = result[0];
      return {
        count: data.count,
        avgPrice: Math.round(data.avgPrice),
        minPrice: data.minPrice,
        maxPrice: data.maxPrice,
        medianPrice: calculateMedian(data.prices),
        windowDays: days,
      };
    }
  }

  const lastWindowDays = windows[windows.length - 1];
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - lastWindowDays);

  const match = {
    ...baseMatch,
    createdAt: { $gte: dateThreshold },
    status: 'active',
    moderationStatus: 'approved',
    price: { $gt: 0 },
  };

  if (excludeId) {
    match._id = { $ne: excludeId };
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        prices: { $push: '$price' },
      },
    },
  ];

  const result = await Ad.aggregate(pipeline);

  if (result.length > 0 && result[0].count > 0) {
    const data = result[0];
    return {
      count: data.count,
      avgPrice: Math.round(data.avgPrice),
      minPrice: data.minPrice,
      maxPrice: data.maxPrice,
      medianPrice: calculateMedian(data.prices),
      windowDays: lastWindowDays,
    };
  }

  return null;
}

async function collectRealtyWithDynamicWindow(baseMatch, excludeId, windows = DEFAULT_WINDOWS, minCount = MIN_SAMPLE_SIZE) {
  for (const days of windows) {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const match = {
      ...baseMatch,
      createdAt: { $gte: dateThreshold },
      status: 'active',
      moderationStatus: 'approved',
      pricePerSqm: { $gt: 0 },
    };

    if (excludeId) {
      match._id = { $ne: excludeId };
    }

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgPricePerSqm: { $avg: '$pricePerSqm' },
          minPricePerSqm: { $min: '$pricePerSqm' },
          maxPricePerSqm: { $max: '$pricePerSqm' },
          pricesPerSqm: { $push: '$pricePerSqm' },
        },
      },
    ];

    const result = await Ad.aggregate(pipeline);

    if (result.length > 0 && result[0].count >= minCount) {
      const data = result[0];
      return {
        count: data.count,
        avgPricePerSqm: Math.round(data.avgPricePerSqm * 100) / 100,
        minPricePerSqm: data.minPricePerSqm,
        maxPricePerSqm: data.maxPricePerSqm,
        medianPricePerSqm: calculateMedian(data.pricesPerSqm),
        windowDays: days,
      };
    }
  }

  return null;
}

function detectComparisonType(ad) {
  const categoryId = ad.categoryId?.toLowerCase() || '';
  const subcategoryId = ad.subcategoryId?.toLowerCase() || '';

  if (ELECTRONICS_CATEGORIES.includes(categoryId) || ELECTRONICS_SUBCATEGORIES.includes(subcategoryId)) {
    return 'electronics';
  }

  if (CARS_CATEGORIES.includes(categoryId) || CARS_SUBCATEGORIES.includes(subcategoryId)) {
    return 'cars';
  }

  if (REALTY_CATEGORIES.includes(categoryId) || REALTY_SUBCATEGORIES.includes(subcategoryId)) {
    return 'realty';
  }

  return 'general';
}

async function getElectronicsStats(ad) {
  if (!ad.brand || !ad.model) {
    return await getGeneralStats(ad);
  }

  const baseMatch = {
    categoryId: ad.categoryId,
    brand: ad.brand?.toLowerCase(),
    model: ad.model?.toLowerCase(),
  };

  if (ad.storageGb) {
    baseMatch.storageGb = ad.storageGb;
  }

  const stats = await collectWithDynamicWindow(baseMatch, ad._id);

  if (!stats) {
    delete baseMatch.storageGb;
    const fallbackStats = await collectWithDynamicWindow(baseMatch, ad._id);
    if (fallbackStats) {
      return { ...fallbackStats, comparisonType: 'electronics' };
    }
    return await getGeneralStats(ad);
  }

  return { ...stats, comparisonType: 'electronics' };
}

async function getCarsStats(ad) {
  if (!ad.carMake || !ad.carModel) {
    return await getGeneralStats(ad);
  }

  const baseMatch = {
    categoryId: ad.categoryId,
    carMake: ad.carMake?.toLowerCase(),
    carModel: ad.carModel?.toLowerCase(),
  };

  if (ad.carYear) {
    baseMatch.carYear = { $gte: ad.carYear - 1, $lte: ad.carYear + 1 };
  }

  const stats = await collectWithDynamicWindow(baseMatch, ad._id);

  if (!stats) {
    delete baseMatch.carYear;
    const fallbackStats = await collectWithDynamicWindow(baseMatch, ad._id);
    if (fallbackStats) {
      return { ...fallbackStats, comparisonType: 'cars' };
    }
    return await getGeneralStats(ad);
  }

  return { ...stats, comparisonType: 'cars' };
}

async function getRealtyStats(ad) {
  if (!ad.realtyAreaTotal || ad.realtyAreaTotal <= 0) {
    return await getGeneralStats(ad);
  }

  const baseMatch = {
    categoryId: ad.categoryId,
  };

  if (ad.realtyType) {
    baseMatch.realtyType = ad.realtyType;
  }

  if (ad.realtyCity) {
    baseMatch.realtyCity = ad.realtyCity?.toLowerCase();
  }

  if (ad.realtyDistrict) {
    baseMatch.realtyDistrict = ad.realtyDistrict?.toLowerCase();
  }

  let stats = await collectRealtyWithDynamicWindow(baseMatch, ad._id);

  if (!stats && ad.realtyDistrict) {
    delete baseMatch.realtyDistrict;
    stats = await collectRealtyWithDynamicWindow(baseMatch, ad._id);
  }

  if (!stats) {
    return await getGeneralStats(ad);
  }

  const avgPrice = stats.avgPricePerSqm * ad.realtyAreaTotal;
  const minPrice = stats.minPricePerSqm * ad.realtyAreaTotal;
  const maxPrice = stats.maxPricePerSqm * ad.realtyAreaTotal;

  return {
    count: stats.count,
    avgPrice: Math.round(avgPrice),
    minPrice: Math.round(minPrice),
    maxPrice: Math.round(maxPrice),
    medianPrice: stats.medianPricePerSqm ? Math.round(stats.medianPricePerSqm * ad.realtyAreaTotal) : null,
    avgPricePerSqm: stats.avgPricePerSqm,
    windowDays: stats.windowDays,
    comparisonType: 'realty',
  };
}

async function getGeneralStats(ad) {
  const baseMatch = {
    categoryId: ad.categoryId,
  };

  if (ad.subcategoryId) {
    baseMatch.subcategoryId = ad.subcategoryId;
  }

  if (ad.city) {
    baseMatch.city = ad.city;
  }

  const stats = await collectWithDynamicWindow(baseMatch, ad._id);

  if (!stats && ad.city) {
    delete baseMatch.city;
    const citylessStats = await collectWithDynamicWindow(baseMatch, ad._id);
    if (citylessStats) {
      return { ...citylessStats, comparisonType: 'general' };
    }
  }

  if (!stats && ad.subcategoryId) {
    delete baseMatch.subcategoryId;
    const subcategorylessStats = await collectWithDynamicWindow(baseMatch, ad._id);
    if (subcategorylessStats) {
      return { ...subcategorylessStats, comparisonType: 'general' };
    }
  }

  return stats ? { ...stats, comparisonType: 'general' } : null;
}

export async function getStatsForAd(adId) {
  const ad = await Ad.findById(adId);
  if (!ad) {
    return null;
  }

  return getStatsForAdData(ad);
}

export async function getStatsForAdData(ad) {
  if (!ad || !ad.price || ad.price <= 0) {
    return { hasMarketData: false };
  }

  const comparisonType = detectComparisonType(ad);
  let stats = null;

  switch (comparisonType) {
    case 'electronics':
      stats = await getElectronicsStats(ad);
      break;
    case 'cars':
      stats = await getCarsStats(ad);
      break;
    case 'realty':
      stats = await getRealtyStats(ad);
      break;
    default:
      stats = await getGeneralStats(ad);
  }

  if (!stats || stats.count === 0) {
    return { hasMarketData: false };
  }

  const diffPercent = stats.avgPrice ? ((ad.price - stats.avgPrice) / stats.avgPrice) * 100 : null;
  const marketLevel = calculateMarketLevel(diffPercent);

  return {
    hasMarketData: true,
    count: stats.count,
    avgPrice: stats.avgPrice,
    minPrice: stats.minPrice,
    maxPrice: stats.maxPrice,
    medianPrice: stats.medianPrice,
    avgPricePerSqm: stats.avgPricePerSqm || null,
    diffPercent: diffPercent !== null ? Math.round(diffPercent * 10) / 10 : null,
    marketLevel,
    windowDays: stats.windowDays,
    comparisonType: stats.comparisonType,
  };
}

export async function getMarketDataForSeller(adId) {
  const ad = await Ad.findById(adId);
  if (!ad) {
    return { hasMarketData: false, error: 'Ad not found' };
  }

  const stats = await getStatsForAdData(ad);
  
  if (!stats.hasMarketData) {
    return { 
      adId: ad._id.toString(),
      hasMarketData: false,
    };
  }

  const labels = generateLabels(stats, ad.price);

  return {
    adId: ad._id.toString(),
    hasMarketData: true,
    windowDays: stats.windowDays,
    count: stats.count,
    avgPrice: stats.avgPrice,
    minPrice: stats.minPrice,
    maxPrice: stats.maxPrice,
    medianPrice: stats.medianPrice,
    avgPricePerSqm: stats.avgPricePerSqm,
    diffPercent: stats.diffPercent,
    labels,
  };
}

export async function getBriefForAd(adId) {
  const snapshot = await AdPriceSnapshot.findOne({ adId });
  
  if (snapshot && isSnapshotFresh(snapshot)) {
    return {
      adId: snapshot.adId.toString(),
      hasMarketData: snapshot.hasMarketData,
      diffPercent: snapshot.diffPercent,
      marketLevel: snapshot.marketLevel,
      avgPrice: snapshot.avgPrice,
    };
  }

  const stats = await getStatsForAd(adId);
  
  if (stats) {
    await updateSnapshotForAd(adId, stats);
  }

  return {
    adId: adId.toString(),
    hasMarketData: stats?.hasMarketData || false,
    diffPercent: stats?.diffPercent || null,
    marketLevel: stats?.marketLevel || 'unknown',
    avgPrice: stats?.avgPrice || null,
  };
}

export async function getBriefForAds(adIds) {
  if (!Array.isArray(adIds) || adIds.length === 0) {
    return [];
  }

  const snapshots = await AdPriceSnapshot.getBriefForAds(adIds);
  const snapshotMap = new Map(snapshots.map(s => [s.adId.toString(), s]));
  
  const result = [];
  const staleAdIds = [];

  for (const adId of adIds) {
    const snapshot = snapshotMap.get(adId.toString());
    if (snapshot && isSnapshotFresh(snapshot)) {
      result.push({
        adId: snapshot.adId.toString(),
        hasMarketData: snapshot.hasMarketData,
        diffPercent: snapshot.diffPercent,
        marketLevel: snapshot.marketLevel,
        avgPrice: snapshot.avgPrice,
      });
    } else {
      staleAdIds.push(adId);
    }
  }

  for (const adId of staleAdIds) {
    const stats = await getStatsForAd(adId);
    if (stats) {
      await updateSnapshotForAd(adId, stats);
      result.push({
        adId: adId.toString(),
        hasMarketData: stats.hasMarketData || false,
        diffPercent: stats.diffPercent || null,
        marketLevel: stats.marketLevel || 'unknown',
        avgPrice: stats.avgPrice || null,
      });
    } else {
      result.push({
        adId: adId.toString(),
        hasMarketData: false,
        diffPercent: null,
        marketLevel: 'unknown',
        avgPrice: null,
      });
    }
  }

  return result;
}

function isSnapshotFresh(snapshot) {
  if (!snapshot || !snapshot.updatedAt) return false;
  const ageMs = Date.now() - snapshot.updatedAt.getTime();
  return ageMs < SNAPSHOT_TTL_HOURS * 60 * 60 * 1000;
}

export async function updateSnapshotForAd(adId, stats = null) {
  if (!stats) {
    stats = await getStatsForAd(adId);
  }

  const ad = await Ad.findById(adId).select('price categoryId subcategoryId');
  
  const data = {
    hasMarketData: stats?.hasMarketData || false,
    avgPrice: stats?.avgPrice || null,
    minPrice: stats?.minPrice || null,
    maxPrice: stats?.maxPrice || null,
    medianPrice: stats?.medianPrice || null,
    count: stats?.count || 0,
    diffPercent: stats?.diffPercent || null,
    marketLevel: stats?.marketLevel || 'unknown',
    windowDays: stats?.windowDays || null,
    avgPricePerSqm: stats?.avgPricePerSqm || null,
    comparisonType: stats?.comparisonType || 'general',
    adPrice: ad?.price || null,
    adCategoryId: ad?.categoryId || null,
    adSubcategoryId: ad?.subcategoryId || null,
  };

  return AdPriceSnapshot.updateSnapshot(adId, data);
}

export async function refreshStaleSnapshots(maxAgeHours = 24, batchSize = 50) {
  const staleSnapshots = await AdPriceSnapshot.getStaleSnapshots(maxAgeHours, batchSize);
  
  let refreshedCount = 0;
  for (const snapshot of staleSnapshots) {
    try {
      await updateSnapshotForAd(snapshot.adId);
      refreshedCount++;
    } catch (error) {
      console.error(`[PriceAnalytics] Error refreshing snapshot for ad ${snapshot.adId}:`, error.message);
    }
  }

  return refreshedCount;
}

export async function getStatsForNewAd(input) {
  const pseudoAd = {
    categoryId: input.categoryId,
    subcategoryId: input.subcategoryId,
    price: input.price,
    brand: input.brand?.toLowerCase(),
    model: input.model?.toLowerCase(),
    storageGb: input.storageGb,
    ramGb: input.ramGb,
    carMake: input.carMake?.toLowerCase(),
    carModel: input.carModel?.toLowerCase(),
    carYear: input.carYear,
    carEngineVolume: input.carEngineVolume,
    carTransmission: input.carTransmission,
    realtyType: input.realtyType,
    realtyRooms: input.realtyRooms,
    realtyAreaTotal: input.realtyAreaTotal,
    realtyCity: input.realtyCity?.toLowerCase(),
    realtyDistrict: input.realtyDistrict?.toLowerCase(),
    city: input.city,
  };

  if (pseudoAd.realtyAreaTotal && pseudoAd.price) {
    pseudoAd.pricePerSqm = pseudoAd.price / pseudoAd.realtyAreaTotal;
  }

  const stats = await getStatsForAdData(pseudoAd);
  
  if (!stats.hasMarketData) {
    return { hasMarketData: false };
  }

  const labels = generateLabels(stats, input.price);

  return {
    hasMarketData: true,
    windowDays: stats.windowDays,
    count: stats.count,
    avgPrice: stats.avgPrice,
    minPrice: stats.minPrice,
    maxPrice: stats.maxPrice,
    medianPrice: stats.medianPrice,
    avgPricePerSqm: stats.avgPricePerSqm,
    diffPercent: stats.diffPercent,
    labels,
  };
}

export default {
  getStatsForAd,
  getStatsForAdData,
  getMarketDataForSeller,
  getBriefForAd,
  getBriefForAds,
  updateSnapshotForAd,
  refreshStaleSnapshots,
  getStatsForNewAd,
};
