import express from 'express';
import CampaignAnalyticsService from '../../services/CampaignAnalyticsService.js';
import { authMiddleware } from '../middleware/auth.js';
import SellerProfile from '../../models/SellerProfile.js';

const router = express.Router();

async function getStoreForUser(userId) {
  return SellerProfile.findOne({ userId });
}

router.get('/campaigns', async (req, res) => {
  try {
    const { type } = req.query;
    const campaigns = await CampaignAnalyticsService.listActiveCampaigns(type || null);
    
    res.json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    console.error('[CampaignAnalytics] List campaigns error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения списка кампаний',
    });
  }
});

router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const { campaignCode, period = '30d' } = req.query;
    
    if (!campaignCode) {
      return res.status(400).json({
        success: false,
        error: 'missing_campaign_code',
        message: 'Укажите campaignCode',
      });
    }

    const overview = await CampaignAnalyticsService.getCampaignOverview(campaignCode, period);
    
    if (!overview) {
      return res.status(404).json({
        success: false,
        error: 'campaign_not_found',
        message: 'Кампания не найдена',
      });
    }

    res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    console.error('[CampaignAnalytics] Overview error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения обзора кампании',
    });
  }
});

router.get('/daily', authMiddleware, async (req, res) => {
  try {
    const { campaignCode, metric = 'views', period = '30d' } = req.query;
    
    if (!campaignCode) {
      return res.status(400).json({
        success: false,
        error: 'missing_campaign_code',
        message: 'Укажите campaignCode',
      });
    }

    const daily = await CampaignAnalyticsService.getCampaignDaily(campaignCode, metric, period);

    res.json({
      success: true,
      data: daily,
    });
  } catch (error) {
    console.error('[CampaignAnalytics] Daily error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения дневной статистики',
    });
  }
});

router.get('/geo', authMiddleware, async (req, res) => {
  try {
    const { campaignCode, period = '30d' } = req.query;
    
    if (!campaignCode) {
      return res.status(400).json({
        success: false,
        error: 'missing_campaign_code',
        message: 'Укажите campaignCode',
      });
    }

    const geo = await CampaignAnalyticsService.getCampaignGeo(campaignCode, period);

    res.json({
      success: true,
      data: geo,
    });
  } catch (error) {
    console.error('[CampaignAnalytics] Geo error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения географии',
    });
  }
});

router.get('/prices', authMiddleware, async (req, res) => {
  try {
    const { campaignCode, period = '30d' } = req.query;
    
    if (!campaignCode) {
      return res.status(400).json({
        success: false,
        error: 'missing_campaign_code',
        message: 'Укажите campaignCode',
      });
    }

    const prices = await CampaignAnalyticsService.getCampaignPrices(campaignCode, period);

    res.json({
      success: true,
      data: prices,
    });
  } catch (error) {
    console.error('[CampaignAnalytics] Prices error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения ценовой аналитики',
    });
  }
});

router.get('/ads', async (req, res) => {
  try {
    const { campaignCode, lat, lng, radiusKm, sort = 'popular', page = 1, limit = 20 } = req.query;
    
    if (!campaignCode) {
      return res.status(400).json({
        success: false,
        error: 'missing_campaign_code',
        message: 'Укажите campaignCode',
      });
    }

    const result = await CampaignAnalyticsService.getCampaignAds(campaignCode, {
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      radiusKm: radiusKm ? parseFloat(radiusKm) : null,
      sort,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[CampaignAnalytics] Ads error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения объявлений кампании',
    });
  }
});

router.get('/store/campaigns', authMiddleware, async (req, res) => {
  try {
    const store = await getStoreForUser(req.currentUser._id);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'store_not_found',
        message: 'Магазин не найден',
      });
    }

    const campaigns = await CampaignAnalyticsService.getStoreCampaigns(store._id);

    res.json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    console.error('[CampaignAnalytics] Store campaigns error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения кампаний магазина',
    });
  }
});

router.get('/store/campaigns/:campaignCode', authMiddleware, async (req, res) => {
  try {
    const { campaignCode } = req.params;
    const { period = '30d' } = req.query;

    const store = await getStoreForUser(req.currentUser._id);
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'store_not_found',
        message: 'Магазин не найден',
      });
    }

    const analytics = await CampaignAnalyticsService.getStoreCampaignAnalytics(
      store._id,
      campaignCode,
      period
    );

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('[CampaignAnalytics] Store campaign analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения аналитики кампании',
    });
  }
});

router.get('/:campaignCode/ads', async (req, res) => {
  try {
    const { campaignCode } = req.params;
    const { lat, lng, radiusKm, sort = 'popular', page = 1, limit = 20 } = req.query;

    const result = await CampaignAnalyticsService.getCampaignAds(campaignCode, {
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      radiusKm: radiusKm ? parseFloat(radiusKm) : null,
      sort,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[CampaignAnalytics] Campaign ads error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения объявлений кампании',
    });
  }
});

router.get('/store/:storeSlug/campaign/:campaignCode/ads', async (req, res) => {
  try {
    const { storeSlug, campaignCode } = req.params;
    const { page = 1, limit = 20, sort = 'popular' } = req.query;

    const store = await SellerProfile.findOne({ slug: storeSlug });
    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'store_not_found',
        message: 'Магазин не найден',
      });
    }

    const result = await CampaignAnalyticsService.getCampaignAds(campaignCode, {
      storeId: store._id.toString(),
      sort,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: {
        store: {
          id: store._id.toString(),
          name: store.name,
          slug: store.slug,
        },
        ...result,
      },
    });
  } catch (error) {
    console.error('[CampaignAnalytics] Store campaign ads error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Ошибка получения объявлений магазина',
    });
  }
});

export default router;
