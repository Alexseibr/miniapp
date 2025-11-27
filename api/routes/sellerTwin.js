import express from 'express';
import SellerTwinEngine from '../../services/SellerTwinEngine.js';
import SellerTwin from '../../models/SellerTwin.js';
import Ad from '../../models/Ad.js';

const router = express.Router();

function getTelegramId(req) {
  return req.headers['x-telegram-id'] || req.query.telegramId || req.user?.telegramId;
}

router.get('/overview', async (req, res) => {
  try {
    const telegramId = getTelegramId(req);
    if (!telegramId) {
      return res.status(401).json({ success: false, error: 'Не авторизован' });
    }

    const overview = await SellerTwinEngine.getOverview(Number(telegramId));

    res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    console.error('[SellerTwin API] overview error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка получения данных',
    });
  }
});

router.get('/recommendations', async (req, res) => {
  try {
    const telegramId = getTelegramId(req);
    if (!telegramId) {
      return res.status(401).json({ success: false, error: 'Не авторизован' });
    }

    const { limit = 10, includeRead = false } = req.query;

    const recommendations = await SellerTwinEngine.getRecommendations(
      Number(telegramId),
      { limit: Number(limit), includeRead: includeRead === 'true' }
    );

    res.json({
      success: true,
      data: recommendations,
      total: recommendations.length,
    });
  } catch (error) {
    console.error('[SellerTwin API] recommendations error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка получения рекомендаций',
    });
  }
});

router.post('/recommendations/:id/read', async (req, res) => {
  try {
    const telegramId = getTelegramId(req);
    if (!telegramId) {
      return res.status(401).json({ success: false, error: 'Не авторизован' });
    }

    const { id } = req.params;

    const twin = await SellerTwin.findOne({ sellerTelegramId: Number(telegramId) });
    if (!twin) {
      return res.status(404).json({ success: false, error: 'Twin не найден' });
    }

    const rec = twin.recommendations.id(id);
    if (rec) {
      rec.isRead = true;
      await twin.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[SellerTwin API] mark read error:', error);
    res.status(500).json({ success: false, error: 'Ошибка' });
  }
});

router.post('/recommendations/:id/acted', async (req, res) => {
  try {
    const telegramId = getTelegramId(req);
    if (!telegramId) {
      return res.status(401).json({ success: false, error: 'Не авторизован' });
    }

    const { id } = req.params;

    const twin = await SellerTwin.findOne({ sellerTelegramId: Number(telegramId) });
    if (!twin) {
      return res.status(404).json({ success: false, error: 'Twin не найден' });
    }

    const rec = twin.recommendations.id(id);
    if (rec) {
      rec.isActedUpon = true;
      rec.isRead = true;
      await twin.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[SellerTwin API] mark acted error:', error);
    res.status(500).json({ success: false, error: 'Ошибка' });
  }
});

router.get('/issues', async (req, res) => {
  try {
    const telegramId = getTelegramId(req);
    if (!telegramId) {
      return res.status(401).json({ success: false, error: 'Не авторизован' });
    }

    const twin = await SellerTwin.findOne({ sellerTelegramId: Number(telegramId) });
    if (!twin) {
      return res.json({ success: true, data: [], total: 0 });
    }

    const issues = twin.getUnresolvedIssues();

    res.json({
      success: true,
      data: issues,
      total: issues.length,
    });
  } catch (error) {
    console.error('[SellerTwin API] issues error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка получения проблем',
    });
  }
});

router.post('/issues/:id/resolve', async (req, res) => {
  try {
    const telegramId = getTelegramId(req);
    if (!telegramId) {
      return res.status(401).json({ success: false, error: 'Не авторизован' });
    }

    const { id } = req.params;

    const twin = await SellerTwin.findOne({ sellerTelegramId: Number(telegramId) });
    if (!twin) {
      return res.status(404).json({ success: false, error: 'Twin не найден' });
    }

    const issue = twin.issues.id(id);
    if (issue) {
      issue.isResolved = true;
      await twin.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[SellerTwin API] resolve issue error:', error);
    res.status(500).json({ success: false, error: 'Ошибка' });
  }
});

router.get('/predictions', async (req, res) => {
  try {
    const telegramId = getTelegramId(req);
    if (!telegramId) {
      return res.status(401).json({ success: false, error: 'Не авторизован' });
    }

    const ads = await Ad.find({
      sellerTelegramId: Number(telegramId),
      status: { $in: ['active', 'published'] },
    }).lean();

    const predictions = [];
    for (const ad of ads.slice(0, 10)) {
      const prediction = await SellerTwinEngine.predictOutcome(ad);
      if (prediction) {
        predictions.push(prediction);
      }
    }

    predictions.sort((a, b) => b.chanceOfSale - a.chanceOfSale);

    res.json({
      success: true,
      data: predictions,
      total: predictions.length,
    });
  } catch (error) {
    console.error('[SellerTwin API] predictions error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка получения прогнозов',
    });
  }
});

router.get('/opportunities', async (req, res) => {
  try {
    const telegramId = getTelegramId(req);
    if (!telegramId) {
      return res.status(401).json({ success: false, error: 'Не авторизован' });
    }

    const { radiusKm = 5, limit = 5 } = req.query;

    const opportunities = await SellerTwinEngine.findMissedOpportunities(
      Number(telegramId),
      { radiusKm: Number(radiusKm), limit: Number(limit) }
    );

    res.json({
      success: true,
      data: opportunities,
      total: opportunities.length,
    });
  } catch (error) {
    console.error('[SellerTwin API] opportunities error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка получения возможностей',
    });
  }
});

router.get('/seasonal', async (req, res) => {
  try {
    const telegramId = getTelegramId(req);
    if (!telegramId) {
      return res.status(401).json({ success: false, error: 'Не авторизован' });
    }

    const insights = SellerTwinEngine.getSeasonalInsights();

    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error('[SellerTwin API] seasonal error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка получения сезонных данных',
    });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const telegramId = getTelegramId(req);
    if (!telegramId) {
      return res.status(401).json({ success: false, error: 'Не авторизован' });
    }

    const twin = await SellerTwinEngine.getOrCreateTwin(Number(telegramId));

    res.json({
      success: true,
      data: twin.settings,
    });
  } catch (error) {
    console.error('[SellerTwin API] settings error:', error);
    res.status(500).json({ success: false, error: 'Ошибка' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const telegramId = getTelegramId(req);
    if (!telegramId) {
      return res.status(401).json({ success: false, error: 'Не авторизован' });
    }

    const updates = req.body;

    const twin = await SellerTwin.findOne({ sellerTelegramId: Number(telegramId) });
    if (!twin) {
      return res.status(404).json({ success: false, error: 'Twin не найден' });
    }

    Object.assign(twin.settings, updates);
    await twin.save();

    res.json({
      success: true,
      data: twin.settings,
    });
  } catch (error) {
    console.error('[SellerTwin API] update settings error:', error);
    res.status(500).json({ success: false, error: 'Ошибка' });
  }
});

router.get('/market-alerts', async (req, res) => {
  try {
    const telegramId = getTelegramId(req);
    if (!telegramId) {
      return res.status(401).json({ success: false, error: 'Не авторизован' });
    }

    const alerts = await SellerTwinEngine.monitorMarketChanges(Number(telegramId));

    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error('[SellerTwin API] market-alerts error:', error);
    res.status(500).json({ success: false, error: 'Ошибка' });
  }
});

export default router;
