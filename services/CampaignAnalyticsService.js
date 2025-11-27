import mongoose from 'mongoose';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import Ad from '../models/Ad.js';
import Season from '../models/Season.js';
import SellerProfile from '../models/SellerProfile.js';

class CampaignAnalyticsService {
  static getPeriodDates(period) {
    const endDate = new Date();
    const startDate = new Date();
    
    const days = parseInt(period) || 30;
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return { startDate, endDate, days };
  }

  static async getCampaignOverview(campaignCode, period = '30d') {
    const { startDate, endDate, days } = this.getPeriodDates(period);
    
    const campaign = await Season.findOne({ code: campaignCode });
    if (!campaign) {
      return null;
    }

    const matchStage = {
      campaignCode,
      createdAt: { $gte: startDate, $lte: endDate },
    };

    const [metrics, sourceBreakdown, topStores, topAds] = await Promise.all([
      AnalyticsEvent.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalViews: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
            totalContacts: { $sum: { $cond: [{ $in: ['$type', ['contact', 'call', 'message']] }, 1, 0] } },
            totalFavorites: { $sum: { $cond: [{ $eq: ['$type', 'favorite'] }, 1, 0] } },
            totalShares: { $sum: { $cond: [{ $eq: ['$type', 'share'] }, 1, 0] } },
          },
        },
      ]),
      
      AnalyticsEvent.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$source',
            views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
            contacts: { $sum: { $cond: [{ $in: ['$type', ['contact', 'call', 'message']] }, 1, 0] } },
          },
        },
        { $sort: { views: -1 } },
      ]),
      
      AnalyticsEvent.aggregate([
        { $match: { ...matchStage, storeId: { $ne: null } } },
        {
          $group: {
            _id: '$storeId',
            views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
            contacts: { $sum: { $cond: [{ $in: ['$type', ['contact', 'call', 'message']] }, 1, 0] } },
          },
        },
        { $sort: { views: -1 } },
        { $limit: 5 },
      ]),
      
      AnalyticsEvent.aggregate([
        { $match: { ...matchStage, adId: { $ne: null } } },
        {
          $group: {
            _id: '$adId',
            views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
            contacts: { $sum: { $cond: [{ $in: ['$type', ['contact', 'call', 'message']] }, 1, 0] } },
            favorites: { $sum: { $cond: [{ $eq: ['$type', 'favorite'] }, 1, 0] } },
          },
        },
        { $sort: { views: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const m = metrics[0] || { totalViews: 0, totalContacts: 0, totalFavorites: 0, totalShares: 0 };
    const ctrContacts = m.totalViews > 0 ? parseFloat(((m.totalContacts / m.totalViews) * 100).toFixed(2)) : 0;

    const storeIds = topStores.map(s => s._id);
    const stores = await SellerProfile.find({ _id: { $in: storeIds } }).select('name slug');
    const storeMap = new Map(stores.map(s => [s._id.toString(), s]));

    const adIds = topAds.map(a => a._id);
    const ads = await Ad.find({ _id: { $in: adIds } }).select('title photos storeId');
    const adMap = new Map(ads.map(a => [a._id.toString(), a]));

    return {
      campaign: {
        code: campaign.code,
        title: campaign.name,
        description: campaign.description,
        type: campaign.type,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        isActive: campaign.isActive,
      },
      period: { startDate, endDate, days },
      metrics: {
        totalViews: m.totalViews,
        totalContacts: m.totalContacts,
        totalFavorites: m.totalFavorites,
        totalShares: m.totalShares,
        ctrContacts,
      },
      sourceBreakdown: sourceBreakdown.map(s => ({
        source: s._id || 'organic',
        views: s.views,
        contacts: s.contacts,
      })),
      topStoresByViews: topStores.map(s => {
        const store = storeMap.get(s._id.toString());
        return {
          storeId: s._id.toString(),
          name: store?.name || 'Unknown',
          slug: store?.slug,
          views: s.views,
          contacts: s.contacts,
        };
      }),
      topAdsByViews: topAds.map(a => {
        const ad = adMap.get(a._id.toString());
        const store = ad?.storeId ? storeMap.get(ad.storeId.toString()) : null;
        return {
          adId: a._id.toString(),
          title: ad?.title || 'Unknown',
          photo: ad?.photos?.[0],
          storeName: store?.name,
          views: a.views,
          contacts: a.contacts,
          favorites: a.favorites,
        };
      }),
    };
  }

  static async getCampaignDaily(campaignCode, metric = 'views', period = '30d') {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const matchStage = {
      campaignCode,
      createdAt: { $gte: startDate, $lte: endDate },
    };

    let typeFilter;
    switch (metric) {
      case 'contacts':
        typeFilter = { $in: ['$type', ['contact', 'call', 'message']] };
        break;
      case 'favorites':
        typeFilter = { $eq: ['$type', 'favorite'] };
        break;
      case 'shares':
        typeFilter = { $eq: ['$type', 'share'] };
        break;
      default:
        typeFilter = { $eq: ['$type', 'view'] };
    }

    const dailyStats = await AnalyticsEvent.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          value: { $sum: { $cond: [typeFilter, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalValue = dailyStats.reduce((sum, d) => sum + d.value, 0);

    return {
      metric,
      data: dailyStats.map(d => ({ date: d._id, value: d.value })),
      totalValue,
    };
  }

  static async getCampaignGeo(campaignCode, period = '30d') {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const ads = await Ad.find({ 
      seasonCode: campaignCode, 
      status: 'active' 
    }).select('city _id');
    
    const adIds = ads.map(a => a._id);
    const cityMap = new Map(ads.map(a => [a._id.toString(), a.city]));

    const geoStats = await AnalyticsEvent.aggregate([
      { 
        $match: { 
          campaignCode,
          adId: { $in: adIds },
          createdAt: { $gte: startDate, $lte: endDate },
        } 
      },
      {
        $group: {
          _id: '$adId',
          views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
          contacts: { $sum: { $cond: [{ $in: ['$type', ['contact', 'call', 'message']] }, 1, 0] } },
        },
      },
    ]);

    const cityStats = {};
    for (const stat of geoStats) {
      const city = cityMap.get(stat._id.toString()) || 'Unknown';
      if (!cityStats[city]) {
        cityStats[city] = { city, views: 0, contacts: 0 };
      }
      cityStats[city].views += stat.views;
      cityStats[city].contacts += stat.contacts;
    }

    const result = Object.values(cityStats).sort((a, b) => b.views - a.views);
    const totalViews = result.reduce((sum, c) => sum + c.views, 0);

    return result.map(c => ({
      ...c,
      percentage: totalViews > 0 ? parseFloat(((c.views / totalViews) * 100).toFixed(1)) : 0,
    }));
  }

  static async getCampaignPrices(campaignCode, period = '30d') {
    const { startDate, endDate } = this.getPeriodDates(period);
    
    const ads = await Ad.find({ 
      seasonCode: campaignCode, 
      status: 'active',
      price: { $gt: 0 },
    }).select('price city');

    if (ads.length === 0) {
      return {
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        adsCount: 0,
        byCity: [],
      };
    }

    const prices = ads.map(a => a.price);
    const avgPrice = parseFloat((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const cityPrices = {};
    for (const ad of ads) {
      const city = ad.city || 'Unknown';
      if (!cityPrices[city]) {
        cityPrices[city] = { city, prices: [], adsCount: 0 };
      }
      cityPrices[city].prices.push(ad.price);
      cityPrices[city].adsCount++;
    }

    const byCity = Object.values(cityPrices).map(c => ({
      city: c.city,
      avgPrice: parseFloat((c.prices.reduce((a, b) => a + b, 0) / c.prices.length).toFixed(2)),
      minPrice: Math.min(...c.prices),
      maxPrice: Math.max(...c.prices),
      adsCount: c.adsCount,
    })).sort((a, b) => b.adsCount - a.adsCount);

    return {
      avgPrice,
      minPrice,
      maxPrice,
      adsCount: ads.length,
      byCity,
    };
  }

  static async getCampaignAds(campaignCode, options = {}) {
    const { lat, lng, radiusKm, sort = 'popular', page = 1, limit = 20, storeId } = options;

    const query = { 
      seasonCode: campaignCode, 
      status: 'active',
    };

    if (storeId) {
      query.storeId = new mongoose.Types.ObjectId(storeId);
    }

    let sortOption = {};
    let geoNear = null;

    if (lat && lng && radiusKm) {
      geoNear = {
        $geoNear: {
          near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: 'distance',
          maxDistance: radiusKm * 1000,
          spherical: true,
          query,
        },
      };
    } else {
      switch (sort) {
        case 'price':
          sortOption = { price: 1 };
          break;
        case 'newest':
          sortOption = { createdAt: -1 };
          break;
        default:
          sortOption = { views: -1, createdAt: -1 };
      }
    }

    const skip = (page - 1) * limit;

    let ads;
    let total;

    if (geoNear) {
      const pipeline = [
        geoNear,
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'sellerprofiles',
            localField: 'storeId',
            foreignField: '_id',
            as: 'store',
          },
        },
        { $unwind: { path: '$store', preserveNullAndEmptyArrays: true } },
      ];

      ads = await Ad.aggregate(pipeline);
      
      const countPipeline = [geoNear, { $count: 'total' }];
      const countResult = await Ad.aggregate(countPipeline);
      total = countResult[0]?.total || 0;
    } else {
      total = await Ad.countDocuments(query);
      ads = await Ad.find(query)
        .populate('storeId', 'name slug')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean();
    }

    const formattedAds = ads.map(ad => ({
      adId: ad._id.toString(),
      title: ad.title,
      price: ad.price,
      currency: ad.currency || 'RUB',
      mainPhotoUrl: ad.photos?.[0] || ad.previewUrl,
      storeName: ad.store?.name || ad.storeId?.name,
      storeSlug: ad.store?.slug || ad.storeId?.slug,
      city: ad.city,
      distanceKm: ad.distance ? parseFloat((ad.distance / 1000).toFixed(1)) : null,
    }));

    return {
      ads: formattedAds,
      total,
      page,
      limit,
      hasMore: skip + ads.length < total,
    };
  }

  static async getStoreCampaigns(storeId) {
    const ads = await Ad.aggregate([
      { 
        $match: { 
          storeId: new mongoose.Types.ObjectId(storeId),
          seasonCode: { $ne: null },
          status: 'active',
        } 
      },
      {
        $group: {
          _id: '$seasonCode',
          adsCount: { $sum: 1 },
        },
      },
    ]);

    if (ads.length === 0) {
      return [];
    }

    const campaignCodes = ads.map(a => a._id);
    const campaigns = await Season.find({ code: { $in: campaignCodes } });
    const campaignMap = new Map(campaigns.map(c => [c.code, c]));

    const events = await AnalyticsEvent.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
          campaignCode: { $in: campaignCodes },
        },
      },
      {
        $group: {
          _id: '$campaignCode',
          views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
          contacts: { $sum: { $cond: [{ $in: ['$type', ['contact', 'call', 'message']] }, 1, 0] } },
        },
      },
    ]);

    const eventMap = new Map(events.map(e => [e._id, e]));

    return ads.map(a => {
      const campaign = campaignMap.get(a._id);
      const event = eventMap.get(a._id) || { views: 0, contacts: 0 };
      
      return {
        campaignCode: a._id,
        title: campaign?.name || a._id,
        description: campaign?.description,
        type: campaign?.type,
        startDate: campaign?.startDate,
        endDate: campaign?.endDate,
        isActive: campaign?.isActive || false,
        adsCount: a.adsCount,
        views: event.views,
        contacts: event.contacts,
      };
    }).sort((a, b) => b.views - a.views);
  }

  static async getStoreCampaignAnalytics(storeId, campaignCode, period = '30d') {
    const { startDate, endDate, days } = this.getPeriodDates(period);
    
    const campaign = await Season.findOne({ code: campaignCode });

    const matchStage = {
      storeId: new mongoose.Types.ObjectId(storeId),
      campaignCode,
      createdAt: { $gte: startDate, $lte: endDate },
    };

    const [metrics, daily, topAds] = await Promise.all([
      AnalyticsEvent.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalViews: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
            totalContacts: { $sum: { $cond: [{ $in: ['$type', ['contact', 'call', 'message']] }, 1, 0] } },
            totalFavorites: { $sum: { $cond: [{ $eq: ['$type', 'favorite'] }, 1, 0] } },
          },
        },
      ]),

      AnalyticsEvent.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
            contacts: { $sum: { $cond: [{ $in: ['$type', ['contact', 'call', 'message']] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      AnalyticsEvent.aggregate([
        { $match: { ...matchStage, adId: { $ne: null } } },
        {
          $group: {
            _id: '$adId',
            views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
            contacts: { $sum: { $cond: [{ $in: ['$type', ['contact', 'call', 'message']] }, 1, 0] } },
            favorites: { $sum: { $cond: [{ $eq: ['$type', 'favorite'] }, 1, 0] } },
          },
        },
        { $sort: { views: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const adIds = topAds.map(a => a._id);
    const ads = await Ad.find({ _id: { $in: adIds } }).select('title photos price');
    const adMap = new Map(ads.map(a => [a._id.toString(), a]));

    const m = metrics[0] || { totalViews: 0, totalContacts: 0, totalFavorites: 0 };

    return {
      campaign: campaign ? {
        code: campaign.code,
        title: campaign.name,
        type: campaign.type,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        isActive: campaign.isActive,
      } : null,
      period: { startDate, endDate, days },
      metrics: {
        totalViews: m.totalViews,
        totalContacts: m.totalContacts,
        totalFavorites: m.totalFavorites,
        conversionRate: m.totalViews > 0 
          ? parseFloat(((m.totalContacts / m.totalViews) * 100).toFixed(2)) 
          : 0,
      },
      daily: daily.map(d => ({ date: d._id, views: d.views, contacts: d.contacts })),
      topAds: topAds.map(a => {
        const ad = adMap.get(a._id.toString());
        return {
          adId: a._id.toString(),
          title: ad?.title || 'Unknown',
          photo: ad?.photos?.[0],
          price: ad?.price,
          views: a.views,
          contacts: a.contacts,
          favorites: a.favorites,
        };
      }),
    };
  }

  static async listActiveCampaigns(type = null) {
    const query = { isActive: true };
    if (type) {
      query.type = type;
    }

    const campaigns = await Season.find(query).sort({ startDate: -1 });
    
    return campaigns.map(c => ({
      code: c.code,
      title: c.name,
      description: c.description,
      type: c.type,
      startDate: c.startDate,
      endDate: c.endDate,
      isActive: c.isActive,
    }));
  }
}

export default CampaignAnalyticsService;
