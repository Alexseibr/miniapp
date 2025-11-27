import { Router } from 'express';
import mongoose from 'mongoose';
import StoreProAnalyticsService from '../../services/StoreProAnalyticsService.js';
import SellerProfile from '../../models/SellerProfile.js';
import AnalyticsEvent from '../../models/AnalyticsEvent.js';
import Season from '../../models/Season.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = Router();

async function getStoreForUser(userId) {
  const store = await SellerProfile.findOne({ userId });
  if (!store) {
    return null;
  }
  return store;
}

function getPeriodDates(days) {
  const endDate = new Date();
  endDate.setUTCHours(23, 59, 59, 999);
  
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - days);
  
  return { startDate, endDate };
}

router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const periodDays = parseInt(days);
    
    const store = await getStoreForUser(req.currentUser._id);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'store_not_found',
        message: 'Магазин не найден',
      });
    }

    const { startDate, endDate } = getPeriodDates(periodDays);
    const previousStart = new Date(startDate);
    previousStart.setDate(previousStart.getDate() - periodDays);

    const [currentStats, previousStats] = await Promise.all([
      AnalyticsEvent.aggregate([
        {
          $match: {
            storeId: new mongoose.Types.ObjectId(store._id),
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalViews: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
            totalContacts: { $sum: { $cond: [{ $eq: ['$type', 'contact'] }, 1, 0] } },
            totalFavorites: { $sum: { $cond: [{ $eq: ['$type', 'favorite'] }, 1, 0] } },
          },
        },
      ]),
      AnalyticsEvent.aggregate([
        {
          $match: {
            storeId: new mongoose.Types.ObjectId(store._id),
            createdAt: { $gte: previousStart, $lt: startDate },
          },
        },
        {
          $group: {
            _id: null,
            totalViews: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
            totalContacts: { $sum: { $cond: [{ $eq: ['$type', 'contact'] }, 1, 0] } },
            totalFavorites: { $sum: { $cond: [{ $eq: ['$type', 'favorite'] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const current = currentStats[0] || { totalViews: 0, totalContacts: 0, totalFavorites: 0 };
    const previous = previousStats[0] || { totalViews: 0, totalContacts: 0, totalFavorites: 0 };

    const calcTrend = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    const conversionRate = current.totalViews > 0 
      ? (current.totalContacts / current.totalViews) * 100 
      : 0;

    res.json({
      success: true,
      data: {
        totalViews: current.totalViews,
        totalContacts: current.totalContacts,
        totalFavorites: current.totalFavorites,
        totalProducts: store.productsCount || 0,
        viewsTrend: calcTrend(current.totalViews, previous.totalViews),
        contactsTrend: calcTrend(current.totalContacts, previous.totalContacts),
        favoritesTrend: calcTrend(current.totalFavorites, previous.totalFavorites),
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        avgTimeToContact: 0,
      },
    });
  } catch (error) {
    console.error('[StoreProAnalytics] Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения дашборда',
    });
  }
});

router.get('/time-series', authMiddleware, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const periodDays = parseInt(days);
    
    const store = await getStoreForUser(req.currentUser._id);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'store_not_found',
        message: 'Магазин не найден',
      });
    }

    const { startDate, endDate } = getPeriodDates(periodDays);

    const dailyStats = await AnalyticsEvent.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(store._id),
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
          contacts: { $sum: { $cond: [{ $eq: ['$type', 'contact'] }, 1, 0] } },
          favorites: { $sum: { $cond: [{ $eq: ['$type', 'favorite'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dateMap = new Map(dailyStats.map(d => [d._id, d]));
    const result = [];

    for (let i = 0; i < periodDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = dateMap.get(dateStr) || { views: 0, contacts: 0, favorites: 0 };
      
      result.push({
        date: dateStr,
        views: dayData.views,
        contacts: dayData.contacts,
        favorites: dayData.favorites,
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[StoreProAnalytics] Time series error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения временного ряда',
    });
  }
});

router.get('/conversion', authMiddleware, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const periodDays = parseInt(days);
    
    const store = await getStoreForUser(req.currentUser._id);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'store_not_found',
        message: 'Магазин не найден',
      });
    }

    const { startDate, endDate } = getPeriodDates(periodDays);

    const stats = await AnalyticsEvent.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(store._id),
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
          contacts: { $sum: { $cond: [{ $eq: ['$type', 'contact'] }, 1, 0] } },
          favorites: { $sum: { $cond: [{ $eq: ['$type', 'favorite'] }, 1, 0] } },
        },
      },
    ]);

    const data = stats[0] || { views: 0, contacts: 0, favorites: 0 };
    
    const viewToContactRate = data.views > 0 ? (data.contacts / data.views) * 100 : 0;
    const viewToFavoriteRate = data.views > 0 ? (data.favorites / data.views) * 100 : 0;

    res.json({
      success: true,
      data: {
        views: data.views,
        contacts: data.contacts,
        favorites: data.favorites,
        viewToContactRate: parseFloat(viewToContactRate.toFixed(2)),
        viewToFavoriteRate: parseFloat(viewToFavoriteRate.toFixed(2)),
      },
    });
  } catch (error) {
    console.error('[StoreProAnalytics] Conversion error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения воронки конверсии',
    });
  }
});

router.get('/products/top', authMiddleware, async (req, res) => {
  try {
    const { days = 30, limit = 10 } = req.query;
    const periodDays = parseInt(days);
    const limitNum = parseInt(limit);
    
    const store = await getStoreForUser(req.currentUser._id);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'store_not_found',
        message: 'Магазин не найден',
      });
    }

    const { startDate, endDate } = getPeriodDates(periodDays);

    const topProducts = await StoreProAnalyticsService.getTopAdsByViews(
      store._id, 
      startDate, 
      endDate, 
      limitNum
    );

    const result = topProducts.map(p => ({
      adId: p.id,
      title: p.title,
      photo: p.photo,
      views: p.views,
      contacts: p.contactClicks,
      favorites: p.favorites,
      conversionRate: p.views > 0 ? parseFloat(((p.contactClicks / p.views) * 100).toFixed(2)) : 0,
    }));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[StoreProAnalytics] Top products error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения топ товаров',
    });
  }
});

router.get('/geo', authMiddleware, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const periodDays = parseInt(days);
    
    const store = await getStoreForUser(req.currentUser._id);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'store_not_found',
        message: 'Магазин не найден',
      });
    }

    const { startDate, endDate } = getPeriodDates(periodDays);

    const geoStats = await AnalyticsEvent.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(store._id),
          'metadata.city': { $ne: null, $exists: true },
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$metadata.city',
          views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
          contacts: { $sum: { $cond: [{ $eq: ['$type', 'contact'] }, 1, 0] } },
        },
      },
      { $sort: { views: -1 } },
      { $limit: 10 },
    ]);

    const totalViews = geoStats.reduce((sum, g) => sum + g.views, 0);

    const result = geoStats.map(g => ({
      city: g._id || 'Неизвестно',
      views: g.views,
      contacts: g.contacts,
      percentage: totalViews > 0 ? parseFloat(((g.views / totalViews) * 100).toFixed(1)) : 0,
    }));

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[StoreProAnalytics] Geo error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения географии',
    });
  }
});

router.get('/campaigns', authMiddleware, async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const periodDays = parseInt(days);
    
    const store = await getStoreForUser(req.currentUser._id);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'store_not_found',
        message: 'Магазин не найден',
      });
    }

    const { startDate, endDate } = getPeriodDates(periodDays);

    const seasons = await Season.find({
      type: { $in: ['store', 'both'] },
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
        { isActive: true },
      ],
    }).lean();

    const campaignStats = await Promise.all(
      seasons.map(async (season) => {
        const stats = await AnalyticsEvent.aggregate([
          {
            $match: {
              storeId: new mongoose.Types.ObjectId(store._id),
              campaignCode: season.code,
              createdAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: null,
              views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
              contacts: { $sum: { $cond: [{ $eq: ['$type', 'contact'] }, 1, 0] } },
            },
          },
        ]);

        const data = stats[0] || { views: 0, contacts: 0 };
        const now = new Date();

        return {
          seasonId: season._id.toString(),
          name: season.name,
          startDate: season.startDate.toISOString(),
          endDate: season.endDate.toISOString(),
          views: data.views,
          contacts: data.contacts,
          isActive: season.isActive && now >= season.startDate && now <= season.endDate,
        };
      })
    );

    res.json({
      success: true,
      data: campaignStats.filter(c => c.views > 0 || c.isActive),
    });
  } catch (error) {
    console.error('[StoreProAnalytics] Campaigns error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения кампаний',
    });
  }
});

router.get('/audience', authMiddleware, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const periodDays = parseInt(days);
    
    const store = await getStoreForUser(req.currentUser._id);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'store_not_found',
        message: 'Магазин не найден',
      });
    }

    const { startDate, endDate } = getPeriodDates(periodDays);

    const audienceStats = await AnalyticsEvent.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(store._id),
          userId: { $ne: null },
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$userId',
          views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
          contacts: { $sum: { $cond: [{ $eq: ['$type', 'contact'] }, 1, 0] } },
          favorites: { $sum: { $cond: [{ $eq: ['$type', 'favorite'] }, 1, 0] } },
        },
      },
    ]);

    const totalUsers = audienceStats.length;
    const returningUsers = audienceStats.filter(u => u.views > 1).length;
    const engagedUsers = audienceStats.filter(u => u.contacts > 0 || u.favorites > 0).length;

    res.json({
      success: true,
      data: {
        totalUsers,
        returningUsers,
        engagedUsers,
        returningRate: totalUsers > 0 ? parseFloat(((returningUsers / totalUsers) * 100).toFixed(1)) : 0,
        engagementRate: totalUsers > 0 ? parseFloat(((engagedUsers / totalUsers) * 100).toFixed(1)) : 0,
      },
    });
  } catch (error) {
    console.error('[StoreProAnalytics] Audience error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения аудитории',
    });
  }
});

router.get('/export', authMiddleware, async (req, res) => {
  try {
    const { days = 30, format = 'csv' } = req.query;
    const periodDays = parseInt(days);
    
    const store = await getStoreForUser(req.currentUser._id);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'store_not_found',
        message: 'Магазин не найден',
      });
    }

    const { startDate, endDate } = getPeriodDates(periodDays);

    const dailyStats = await AnalyticsEvent.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(store._id),
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          views: { $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] } },
          contacts: { $sum: { $cond: [{ $eq: ['$type', 'contact'] }, 1, 0] } },
          favorites: { $sum: { $cond: [{ $eq: ['$type', 'favorite'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    if (format === 'csv') {
      const csvHeader = 'Дата,Просмотры,Контакты,Избранное\n';
      const csvRows = dailyStats.map(d => 
        `${d._id},${d.views},${d.contacts},${d.favorites}`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_${store.slug}_${days}d.csv"`);
      res.send('\ufeff' + csvHeader + csvRows);
    } else {
      res.json({
        success: true,
        data: dailyStats.map(d => ({
          date: d._id,
          views: d.views,
          contacts: d.contacts,
          favorites: d.favorites,
        })),
      });
    }
  } catch (error) {
    console.error('[StoreProAnalytics] Export error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка экспорта данных',
    });
  }
});

router.post('/track', authMiddleware, async (req, res) => {
  try {
    const { adId, type, source, geo, campaignCode } = req.body;
    
    if (!adId || !type) {
      return res.status(400).json({
        success: false,
        error: 'missing_params',
        message: 'Укажите adId и type',
      });
    }

    const validTypes = ['view', 'contact', 'favorite', 'unfavorite', 'message', 'call', 'share', 'search_hit'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_type',
        message: 'Недопустимый тип события',
      });
    }

    const event = await StoreProAnalyticsService.trackAdEvent(adId, type, {
      source,
      geo,
      campaignCode,
      userId: req.currentUser?._id,
      platform: req.headers['x-platform'] || 'telegram',
    });

    res.json({
      success: true,
      tracked: !!event,
    });
  } catch (error) {
    console.error('[StoreProAnalytics] Track event error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка записи события',
    });
  }
});

export default router;
