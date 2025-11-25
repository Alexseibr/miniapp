import { Router } from 'express';
import SmartSearchService from '../../services/SmartSearchService.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { query, lat, lng, radiusKm = '10', limit = '50', sort = 'distance' } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        ok: false,
        error: 'Query must be at least 2 characters',
      });
    }

    try {
      const result = await SmartSearchService.search({
        query: query.trim(),
        lat,
        lng,
        radiusKm: parseFloat(radiusKm) || 10,
        limit: Math.min(parseInt(limit) || 50, 100),
        sort,
      });

      res.set('Cache-Control', 'public, max-age=60');
      res.json({
        ok: true,
        ...result,
      });
    } catch (error) {
      console.error('Global search error:', error);
      res.status(500).json({
        ok: false,
        error: 'Search failed',
      });
    }
  })
);

router.get(
  '/suggest',
  asyncHandler(async (req, res) => {
    const { query, limit = '10' } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({
        ok: true,
        categories: [],
        brands: [],
        keywords: [],
      });
    }

    try {
      const suggestions = await SmartSearchService.getSuggestions(
        query.trim(),
        Math.min(parseInt(limit) || 10, 20)
      );

      res.set('Cache-Control', 'public, max-age=120');
      res.json({
        ok: true,
        query: query.trim(),
        ...suggestions,
      });
    } catch (error) {
      console.error('Search suggest error:', error);
      res.status(500).json({
        ok: false,
        error: 'Suggestions failed',
      });
    }
  })
);

export default router;
