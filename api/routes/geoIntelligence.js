import express from 'express';
import geoEngine from '../../services/geo/GeoEngine.js';

const router = express.Router();

router.get('/heatmap/demand', async (req, res) => {
  try {
    const { lat, lng, radiusKm = 10, hours = 24 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'lat and lng are required'
      });
    }
    
    const result = await geoEngine.getHeatmapDemand({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radiusKm: parseFloat(radiusKm),
      hours: parseInt(hours)
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[GeoAPI] heatmap/demand error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/heatmap/supply', async (req, res) => {
  try {
    const { lat, lng, radiusKm = 10, categoryId } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'lat and lng are required'
      });
    }
    
    const result = await geoEngine.getHeatmapSupply({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radiusKm: parseFloat(radiusKm),
      categoryId
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[GeoAPI] heatmap/supply error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/trending-searches', async (req, res) => {
  try {
    const { lat, lng, radiusKm = 10, limit = 10 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'lat and lng are required'
      });
    }
    
    const result = await geoEngine.getTrendingSearches({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radiusKm: parseFloat(radiusKm),
      limit: parseInt(limit)
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[GeoAPI] trending-searches error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/trending-supply', async (req, res) => {
  try {
    const { lat, lng, radiusKm = 10, hours = 24, limit = 10 } = req.query;
    
    const result = await geoEngine.getTrendingSupply({
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radiusKm: parseFloat(radiusKm),
      hours: parseInt(hours),
      limit: parseInt(limit)
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[GeoAPI] trending-supply error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/feed', async (req, res) => {
  try {
    const { lat, lng, radiusKm = 10, categoryId, subcategoryId, priceMin, priceMax, sortBy = 'distance', limit = 20, skip = 0 } = req.query;
    
    const result = await geoEngine.getGeoFeed({
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radiusKm: parseFloat(radiusKm),
      categoryId,
      subcategoryId,
      priceMin: priceMin ? parseFloat(priceMin) : undefined,
      priceMax: priceMax ? parseFloat(priceMax) : undefined,
      sortBy,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[GeoAPI] feed error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/clusters', async (req, res) => {
  try {
    const { lat, lng, radiusKm = 10, zoom = 12, categoryId } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'lat and lng are required'
      });
    }
    
    const result = await geoEngine.getClusteredMarkers({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radiusKm: parseFloat(radiusKm),
      zoom: parseInt(zoom),
      categoryId
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[GeoAPI] clusters error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/demand/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { lat, lng, radiusKm = 20 } = req.query;
    
    const result = await geoEngine.getDemandForCategory({
      categoryId,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radiusKm: parseFloat(radiusKm)
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[GeoAPI] demand error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/recommendations', async (req, res) => {
  try {
    const { telegramId, lat, lng, role = 'buyer' } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'lat and lng are required'
      });
    }
    
    const result = await geoEngine.getGeoRecommendations({
      telegramId: telegramId ? parseInt(telegramId) : undefined,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      role
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[GeoAPI] recommendations error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/events', async (req, res) => {
  try {
    const { type, lat, lng, telegramId, payload } = req.body;
    
    if (!type || !lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'type, lat, and lng are required'
      });
    }
    
    const result = await geoEngine.logGeoEvent({
      type,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      telegramId: telegramId ? parseInt(telegramId) : undefined,
      payload
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[GeoAPI] events error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
