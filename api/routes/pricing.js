import express from 'express';
import mongoose from 'mongoose';
import PriceAnalyticsService from '../../services/PriceAnalyticsService.js';

const router = express.Router();

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

router.get('/ad/:adId/market', async (req, res, next) => {
  try {
    const { adId } = req.params;

    if (!isValidObjectId(adId)) {
      return res.status(400).json({ 
        hasMarketData: false, 
        error: 'Invalid ad ID format' 
      });
    }

    const result = await PriceAnalyticsService.getMarketDataForSeller(adId);

    res.set('Cache-Control', 'private, max-age=300');
    return res.json(result);
  } catch (error) {
    console.error('[Pricing API] Error getting market data:', error);
    next(error);
  }
});

router.get('/brief/:adId', async (req, res, next) => {
  try {
    const { adId } = req.params;

    if (!isValidObjectId(adId)) {
      return res.status(400).json({ 
        hasMarketData: false, 
        error: 'Invalid ad ID format' 
      });
    }

    const result = await PriceAnalyticsService.getBriefForAd(adId);

    res.set('Cache-Control', 'private, max-age=600');
    return res.json(result);
  } catch (error) {
    console.error('[Pricing API] Error getting brief:', error);
    next(error);
  }
});

router.post('/brief/batch', async (req, res, next) => {
  try {
    const { adIds } = req.body;

    if (!Array.isArray(adIds) || adIds.length === 0) {
      return res.status(400).json({ 
        error: 'adIds must be a non-empty array' 
      });
    }

    if (adIds.length > 50) {
      return res.status(400).json({ 
        error: 'Maximum 50 ads per batch request' 
      });
    }

    const validAdIds = adIds.filter(id => isValidObjectId(id));

    if (validAdIds.length === 0) {
      return res.status(400).json({ 
        error: 'No valid ad IDs provided' 
      });
    }

    const results = await PriceAnalyticsService.getBriefForAds(validAdIds);

    res.set('Cache-Control', 'private, max-age=600');
    return res.json({ items: results });
  } catch (error) {
    console.error('[Pricing API] Error getting batch briefs:', error);
    next(error);
  }
});

router.post('/estimate', async (req, res, next) => {
  try {
    const {
      categoryId,
      subcategoryId,
      price,
      brand,
      model,
      storageGb,
      ramGb,
      carMake,
      carModel,
      carYear,
      carEngineVolume,
      carTransmission,
      realtyType,
      realtyRooms,
      realtyAreaTotal,
      realtyCity,
      realtyDistrict,
      city,
    } = req.body;

    if (!categoryId) {
      return res.status(400).json({ 
        hasMarketData: false, 
        error: 'categoryId is required' 
      });
    }

    if (!price || price <= 0) {
      return res.status(400).json({ 
        hasMarketData: false, 
        error: 'Valid price is required' 
      });
    }

    const result = await PriceAnalyticsService.getStatsForNewAd({
      categoryId,
      subcategoryId,
      price: Number(price),
      brand,
      model,
      storageGb: storageGb ? Number(storageGb) : null,
      ramGb: ramGb ? Number(ramGb) : null,
      carMake,
      carModel,
      carYear: carYear ? Number(carYear) : null,
      carEngineVolume: carEngineVolume ? Number(carEngineVolume) : null,
      carTransmission,
      realtyType,
      realtyRooms: realtyRooms ? Number(realtyRooms) : null,
      realtyAreaTotal: realtyAreaTotal ? Number(realtyAreaTotal) : null,
      realtyCity,
      realtyDistrict,
      city,
    });

    res.set('Cache-Control', 'private, max-age=60');
    return res.json(result);
  } catch (error) {
    console.error('[Pricing API] Error estimating price:', error);
    next(error);
  }
});

router.post('/refresh-snapshots', async (req, res, next) => {
  try {
    const { maxAgeHours = 24, batchSize = 50 } = req.body;

    const refreshedCount = await PriceAnalyticsService.refreshStaleSnapshots(
      Math.min(maxAgeHours, 168),
      Math.min(batchSize, 200)
    );

    return res.json({ 
      success: true, 
      refreshedCount 
    });
  } catch (error) {
    console.error('[Pricing API] Error refreshing snapshots:', error);
    next(error);
  }
});

export default router;
