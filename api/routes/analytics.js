const express = require('express');
const router = express.Router();
const AnalyticsService = require('../../services/AnalyticsService');
const mongoose = require('mongoose');

/**
 * GET /api/analytics/category/:id/price-trend
 * Get price trends for a category
 */
router.get('/category/:id/price-trend', async (req, res) => {
  try {
    const { id } = req.params;
    const days = parseInt(req.query.days) || 30;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const trends = await AnalyticsService.getSeasonalTrends(id, days);
    res.json({ trends });
  } catch (error) {
    console.error('Error getting price trends:', error);
    res.status(500).json({ error: 'Failed to get price trends' });
  }
});

/**
 * GET /api/analytics/category/:id/overview
 * Get category overview with current stats and trends
 */
router.get('/category/:id/overview', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const overview = await AnalyticsService.getCategoryOverview(id);
    if (!overview) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(overview);
  } catch (error) {
    console.error('Error getting category overview:', error);
    res.status(500).json({ error: 'Failed to get category overview' });
  }
});

/**
 * GET /api/analytics/ad/:id/compare
 * Compare ad price to market average
 */
router.get('/ad/:id/compare', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ad ID' });
    }

    const comparison = await AnalyticsService.comparePriceToMarket(id);
    if (!comparison) {
      return res.status(404).json({ error: 'Ad not found or no price data' });
    }

    res.json(comparison);
  } catch (error) {
    console.error('Error comparing ad price:', error);
    res.status(500).json({ error: 'Failed to compare price' });
  }
});

/**
 * POST /api/analytics/refresh
 * Manually trigger stats refresh (admin only)
 */
router.post('/refresh', async (req, res) => {
  try {
    const results = await AnalyticsService.updateAllFarmerStats();
    res.json({ 
      message: 'Stats refresh completed',
      results 
    });
  } catch (error) {
    console.error('Error refreshing stats:', error);
    res.status(500).json({ error: 'Failed to refresh stats' });
  }
});

module.exports = router;
