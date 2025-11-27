import { Router } from 'express';
import StoreProAnalyticsService from '../../services/StoreProAnalyticsService.js';
import SellerProfile from '../../models/SellerProfile.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = Router();

async function getStoreForUser(userId) {
  const store = await SellerProfile.findOne({ userId });
  if (!store) {
    return null;
  }
  return store;
}

router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const store = await getStoreForUser(req.currentUser._id);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'store_not_found',
        message: 'Магазин не найден',
      });
    }

    const overview = await StoreProAnalyticsService.getOverview(store._id, period);
    
    res.json({
      success: true,
      ...overview,
    });
  } catch (error) {
    console.error('[StoreProAnalytics] Overview error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения обзора аналитики',
    });
  }
});

router.get('/daily', authMiddleware, async (req, res) => {
  try {
    const { metric = 'views', period = '30d' } = req.query;
    
    const store = await getStoreForUser(req.currentUser._id);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'store_not_found',
        message: 'Магазин не найден',
      });
    }

    const dailyStats = await StoreProAnalyticsService.getDailyMetrics(store._id, metric, period);
    
    res.json({
      success: true,
      ...dailyStats,
    });
  } catch (error) {
    console.error('[StoreProAnalytics] Daily stats error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения дневной статистики',
    });
  }
});

router.get('/daily-detail', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'missing_date',
        message: 'Укажите дату',
      });
    }
    
    const store = await getStoreForUser(req.currentUser._id);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'store_not_found',
        message: 'Магазин не найден',
      });
    }

    const detail = await StoreProAnalyticsService.getDailyDetail(store._id, date);
    
    res.json({
      success: true,
      ...detail,
    });
  } catch (error) {
    console.error('[StoreProAnalytics] Daily detail error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения детальной статистики за день',
    });
  }
});

router.get('/ads', authMiddleware, async (req, res) => {
  try {
    const { period = '30d', sort = 'views' } = req.query;
    
    const store = await getStoreForUser(req.currentUser._id);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'store_not_found',
        message: 'Магазин не найден',
      });
    }

    const ads = await StoreProAnalyticsService.getAdsEfficiency(store._id, period, sort);
    
    res.json({
      success: true,
      ads,
      count: ads.length,
    });
  } catch (error) {
    console.error('[StoreProAnalytics] Ads efficiency error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения эффективности объявлений',
    });
  }
});

router.get('/seasonal', authMiddleware, async (req, res) => {
  try {
    const { period = '365d' } = req.query;
    
    const store = await getStoreForUser(req.currentUser._id);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'store_not_found',
        message: 'Магазин не найден',
      });
    }

    const seasonal = await StoreProAnalyticsService.getSeasonalAnalytics(store._id, period);
    
    res.json({
      success: true,
      ...seasonal,
    });
  } catch (error) {
    console.error('[StoreProAnalytics] Seasonal error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения сезонной аналитики',
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

router.post('/rebuild', authMiddleware, async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;
    
    const store = await getStoreForUser(req.currentUser._id);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'store_not_found',
        message: 'Магазин не найден',
      });
    }

    const from = fromDate ? new Date(fromDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const to = toDate ? new Date(toDate) : new Date();

    const count = await StoreProAnalyticsService.rebuildStoreStats(store._id, from, to);
    
    res.json({
      success: true,
      rebuiltDays: count,
    });
  } catch (error) {
    console.error('[StoreProAnalytics] Rebuild error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка перестроения статистики',
    });
  }
});

export default router;
