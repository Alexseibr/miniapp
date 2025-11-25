import { Router } from 'express';
import TrendAnalyticsService from '../../services/TrendAnalyticsService.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

router.get(
  '/local',
  asyncHandler(async (req, res) => {
    const { lat, lng, radiusKm = '10', limit = '10' } = req.query;

    const parsedLat = lat ? parseFloat(lat) : undefined;
    const parsedLng = lng ? parseFloat(lng) : undefined;
    const parsedRadius = Math.min(Math.max(parseFloat(radiusKm) || 10, 1), 100);
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

    try {
      const trends = await TrendAnalyticsService.getLocalTrends(
        parsedLat,
        parsedLng,
        parsedRadius,
        parsedLimit
      );

      res.set('Cache-Control', 'public, max-age=300');
      res.json({
        ok: true,
        trends,
        total: trends.length,
        radiusKm: parsedRadius,
      });
    } catch (error) {
      console.error('Local trends API error:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch local trends',
      });
    }
  })
);

router.get(
  '/country',
  asyncHandler(async (req, res) => {
    const { limit = '10' } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

    try {
      const trends = await TrendAnalyticsService.getCountryTrends(parsedLimit);

      res.set('Cache-Control', 'public, max-age=300');
      res.json({
        ok: true,
        trends,
        total: trends.length,
      });
    } catch (error) {
      console.error('Country trends API error:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch country trends',
      });
    }
  })
);

router.post(
  '/analyze',
  asyncHandler(async (req, res) => {
    try {
      const trends = await TrendAnalyticsService.analyzeTrends();

      res.json({
        ok: true,
        message: 'Trend analysis completed',
        trendsCreated: trends.length,
      });
    } catch (error) {
      console.error('Trend analysis API error:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to run trend analysis',
      });
    }
  })
);

export default router;
