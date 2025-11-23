import { Router } from 'express';
import CityLayout from '../../models/CityLayout.js';
import City from '../../models/City.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { cityCode = 'brest', screen = 'home', variant, seasonCode } = req.query;

    const normalizedCityCode = cityCode.toLowerCase().trim();
    const normalizedScreen = screen.toLowerCase().trim();

    const query = {
      cityCode: normalizedCityCode,
      screen: normalizedScreen,
      isActive: true,
    };

    if (variant) {
      query.variant = variant.toLowerCase().trim();
    }

    if (seasonCode) {
      query.seasonCode = seasonCode.toLowerCase().trim();
    }

    const layout = await CityLayout.findOne(query).sort({ priority: -1 }).lean();

    if (!layout) {
      return res.status(404).json({
        error: 'Layout not found',
        cityCode: normalizedCityCode,
        screen: normalizedScreen,
        variant,
        seasonCode,
      });
    }

    const city = await City.findOne({ code: normalizedCityCode, isActive: true }).lean();

    const normalizedBlocks = (layout.blocks || []).map((block, index) => ({
      id: block.id || `${block.type}_${index}`,
      type: block.type,
      order: block.order,
      config: block.config || {},
      ...block.config,
    }));

    return res.json({
      cityCode: layout.cityCode,
      screen: layout.screen,
      variant: layout.variant,
      seasonCode: layout.seasonCode,
      blocks: normalizedBlocks,
      city: city || null,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/all', async (req, res, next) => {
  try {
    const { cityCode, screen, isActive = 'true' } = req.query;

    const query = {};

    if (cityCode) {
      query.cityCode = cityCode.toLowerCase().trim();
    }

    if (screen) {
      query.screen = screen.toLowerCase().trim();
    }

    if (isActive === 'true') {
      query.isActive = true;
    }

    const layouts = await CityLayout.find(query).sort({ priority: -1 }).lean();

    return res.json({
      layouts,
      total: layouts.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
