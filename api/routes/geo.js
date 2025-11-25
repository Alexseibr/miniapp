import { Router } from 'express';
import fetch from 'node-fetch';
import geoEngine from '../../services/geo/GeoEngine.js';
import hotspotEngine from '../../services/geo/HotspotEngine.js';
import seasonalService from '../../services/geo/SeasonalInsightService.js';
import Ad from '../../models/Ad.js';
import User from '../../models/User.js';
import Season from '../../models/Season.js';

const router = Router();

router.get('/full-feed', async (req, res) => {
  try {
    const { 
      lat, lng, radius = 5, 
      category, q, 
      limit = 20, skip = 0 
    } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'lat and lng are required'
      });
    }
    
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusKm = parseFloat(radius);
    
    const [feedResult, clustersResult, trendingResult, supplyResult] = await Promise.all([
      geoEngine.getGeoFeed({
        lat: latNum,
        lng: lngNum,
        radiusKm,
        categoryId: category,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }),
      geoEngine.getClusteredMarkers({
        lat: latNum,
        lng: lngNum,
        radiusKm,
        zoom: 13,
        categoryId: category
      }),
      geoEngine.getTrendingSearches({
        lat: latNum,
        lng: lngNum,
        radiusKm,
        limit: 10
      }),
      geoEngine.getTrendingSupply({
        lat: latNum,
        lng: lngNum,
        radiusKm,
        hours: 24,
        limit: 10
      })
    ]);
    
    let farmers = [];
    try {
      const farmerUsers = await User.find({
        'farmerProfile.isActive': true,
        'location.coordinates': {
          $geoWithin: {
            $centerSphere: [[lngNum, latNum], radiusKm / 6378.1]
          }
        }
      }).limit(20).lean();
      
      farmers = farmerUsers.map(f => ({
        lat: f.location?.coordinates?.[1],
        lng: f.location?.coordinates?.[0],
        sellerId: f._id.toString(),
        sellerName: f.displayName || f.firstName,
        itemsCount: f.farmerProfile?.productsCount || 0,
        distanceKm: 0
      })).filter(f => f.lat && f.lng);
    } catch (e) {
      console.warn('[FullFeed] Farmer lookup failed:', e.message);
    }
    
    let seasonHighlights = [];
    try {
      const currentDate = new Date();
      const activeSeason = await Season.findOne({
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate },
        status: 'active'
      }).lean();
      
      if (activeSeason && activeSeason.categoryIds?.length) {
        const seasonAds = await Ad.find({
          categoryId: { $in: activeSeason.categoryIds },
          status: 'active',
          moderationStatus: 'approved',
          'location.coordinates': {
            $geoWithin: {
              $centerSphere: [[lngNum, latNum], radiusKm / 6378.1]
            }
          }
        })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean();
        
        seasonHighlights = seasonAds.map(ad => ({
          _id: ad._id.toString(),
          title: ad.title,
          price: ad.price,
          currency: ad.currency,
          photos: ad.photos,
          isSeasonal: true
        }));
      }
    } catch (e) {
      console.warn('[FullFeed] Season lookup failed:', e.message);
    }
    
    const trendingSearches = trendingResult.success 
      ? trendingResult.data.trends?.map(t => t.query) || []
      : [];
    
    const trendingSupply = supplyResult.success
      ? supplyResult.data.trends?.map(t => t.categoryName || t.categoryId) || []
      : [];
    
    const aiHints = [];
    
    if (trendingSearches.length > 0) {
      aiHints.push(`В вашем районе ищут: ${trendingSearches.slice(0, 2).join(', ')}`);
    }
    
    if (seasonHighlights.length > 0) {
      aiHints.push(`Сезонные товары рядом с вами — ${seasonHighlights.length} предложений`);
    }
    
    if (feedResult.success && feedResult.data.ads?.length > 0) {
      const nearbyCount = feedResult.data.ads.filter(ad => 
        parseFloat(ad.distanceKm || '999') < 1
      ).length;
      if (nearbyCount > 0) {
        aiHints.push(`${nearbyCount} объявлений в радиусе 1 км от вас`);
      }
    }
    
    if (farmers.length > 0) {
      aiHints.push(`${farmers.length} фермеров продают свежие продукты рядом`);
    }
    
    return res.json({
      success: true,
      data: {
        feed: feedResult.success ? feedResult.data.ads : [],
        clusters: clustersResult.success ? clustersResult.data.clusters : [],
        farmers,
        seasonHighlights,
        trendingSearches,
        trendingSupply,
        aiHints,
        totalAds: feedResult.success ? feedResult.data.total : 0
      }
    });
    
  } catch (error) {
    console.error('[GeoAPI] full-feed error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/farmers', async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'lat and lng are required'
      });
    }
    
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusKm = parseFloat(radius);
    
    const farmerUsers = await User.find({
      'farmerProfile.isActive': true,
      'location.coordinates': {
        $geoWithin: {
          $centerSphere: [[lngNum, latNum], radiusKm / 6378.1]
        }
      }
    }).limit(50).lean();
    
    const farmers = farmerUsers.map(f => {
      const fLat = f.location?.coordinates?.[1];
      const fLng = f.location?.coordinates?.[0];
      let distance = 0;
      
      if (fLat && fLng) {
        const R = 6371;
        const dLat = (fLat - latNum) * Math.PI / 180;
        const dLng = (fLng - lngNum) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(latNum * Math.PI / 180) * Math.cos(fLat * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      }
      
      return {
        lat: fLat,
        lng: fLng,
        sellerId: f._id.toString(),
        sellerName: f.displayName || f.firstName || 'Фермер',
        itemsCount: f.farmerProfile?.productsCount || 0,
        distanceKm: Math.round(distance * 10) / 10,
        isOnlineSeller: f.farmerProfile?.subscriptionTier !== 'FREE'
      };
    }).filter(f => f.lat && f.lng);
    
    return res.json({
      success: true,
      data: { farmers }
    });
    
  } catch (error) {
    console.error('[GeoAPI] farmers error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/hotspots', async (req, res) => {
  try {
    const { lat, lng, radius = 10, type = 'demand', hours = 24 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'lat and lng are required'
      });
    }
    
    const params = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radiusKm: parseFloat(radius),
      hours: parseInt(hours)
    };
    
    let result;
    if (type === 'supply') {
      result = await hotspotEngine.getSupplyHotspots(params);
    } else if (type === 'opportunity') {
      result = await hotspotEngine.getOpportunityZones(params);
    } else {
      result = await hotspotEngine.getDemandHotspots(params);
    }
    
    return res.json(result);
    
  } catch (error) {
    console.error('[GeoAPI] hotspots error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/seasonal/trends', async (req, res) => {
  try {
    const { lat, lng, radius = 20 } = req.query;
    
    const result = await seasonalService.getSeasonalTrends({
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radiusKm: parseFloat(radius)
    });
    
    return res.json(result);
    
  } catch (error) {
    console.error('[GeoAPI] seasonal/trends error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/seasonal/ads', async (req, res) => {
  try {
    const { lat, lng, radius = 10, season, limit = 20 } = req.query;
    
    if (!season) {
      return res.status(400).json({
        success: false,
        error: 'season code is required'
      });
    }
    
    const result = await seasonalService.getSeasonalAds({
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radiusKm: parseFloat(radius),
      seasonCode: season,
      limit: parseInt(limit)
    });
    
    return res.json(result);
    
  } catch (error) {
    console.error('[GeoAPI] seasonal/ads error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/seasonal/demand', async (req, res) => {
  try {
    const { lat, lng, radius = 20, hours = 48 } = req.query;
    
    const result = await seasonalService.getSeasonalDemand({
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radiusKm: parseFloat(radius),
      hours: parseInt(hours)
    });
    
    return res.json(result);
    
  } catch (error) {
    console.error('[GeoAPI] seasonal/demand error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/seasonal/hints', async (req, res) => {
  try {
    const { lat, lng, radius = 10, role = 'buyer' } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'lat and lng are required'
      });
    }
    
    const result = await seasonalService.generateSeasonalHints({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radiusKm: parseFloat(radius),
      role
    });
    
    return res.json(result);
    
  } catch (error) {
    console.error('[GeoAPI] seasonal/hints error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/seasonality', async (req, res) => {
  try {
    const currentDate = new Date();
    const month = currentDate.getMonth();
    
    const seasonalTrends = [];
    
    if (month >= 4 && month <= 7) {
      seasonalTrends.push({ category: 'berries', trend: 'high', label: 'Сезон ягод' });
    }
    if (month >= 7 && month <= 9) {
      seasonalTrends.push({ category: 'vegetables', trend: 'high', label: 'Урожай овощей' });
    }
    if (month >= 2 && month <= 4) {
      seasonalTrends.push({ category: 'flowers', trend: 'high', label: 'Весенние цветы' });
    }
    
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      seasonalTrends.push({ category: 'bakery', trend: 'medium', label: 'Выходные — выпечка' });
    }
    
    return res.json({
      success: true,
      data: { trends: seasonalTrends }
    });
    
  } catch (error) {
    console.error('[GeoAPI] seasonality error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/ai-hints', async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'lat and lng are required'
      });
    }
    
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusKm = parseFloat(radius);
    
    const hints = [];
    
    const [trendingResult, supplyResult] = await Promise.all([
      geoEngine.getTrendingSearches({ lat: latNum, lng: lngNum, radiusKm, limit: 3 }),
      geoEngine.getTrendingSupply({ lat: latNum, lng: lngNum, radiusKm, hours: 24, limit: 3 })
    ]);
    
    if (trendingResult.success && trendingResult.data.trends?.length) {
      const topSearch = trendingResult.data.trends[0];
      hints.push(`В вашем районе ищут: ${topSearch.query}`);
    }
    
    if (supplyResult.success && supplyResult.data.trends?.length) {
      hints.push(`Новые объявления рядом: +${supplyResult.data.trends.length} за сутки`);
    }
    
    return res.json({
      success: true,
      data: { hints }
    });
    
  } catch (error) {
    console.error('[GeoAPI] ai-hints error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.post('/resolve', async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Требуются корректные координаты lat и lng' });
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return res.status(400).json({ error: 'Координаты вне допустимого диапазона' });
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latNum}&lon=${lngNum}&accept-language=ru&addressdetails=1`;

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'KETMAR-Market/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API вернул статус ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.error) {
      return res.status(404).json({
        error: 'Не удалось определить местоположение',
        label: 'Неизвестное место',
      });
    }

    const addr = data.address || {};
    const city = addr.city || addr.town || addr.village || addr.hamlet || null;
    const suburb = addr.suburb || addr.neighbourhood || addr.quarter || null;
    const village = addr.village || addr.hamlet || null;
    const district = addr.city_district || null;

    let label = '';
    let area = null;

    if (village && !city) {
      label = `д. ${village}`;
    } else if (city && suburb) {
      area = suburb;
      label = `${city} (${suburb})`;
    } else if (city && district) {
      area = district;
      label = `${city} (${district})`;
    } else if (city) {
      label = city;
    } else if (village) {
      label = `д. ${village}`;
    } else {
      label = addr.state || addr.country || 'Неизвестное место';
    }

    const result = {
      lat: latNum,
      lng: lngNum,
      city: city || village || null,
      area,
      village: village && !city ? village : null,
      label,
      raw: {
        display_name: data.display_name,
        address: addr,
      },
    };

    res.json(result);
  } catch (error) {
    console.error('Ошибка геокодинга:', error);
    res.status(500).json({
      error: 'Ошибка сервера при определении местоположения',
      label: 'Неизвестное место',
    });
  }
});

router.get('/preset-locations', (req, res) => {
  const presetLocations = [
    { city: 'Минск', label: 'Минск', lat: 53.9045, lng: 27.5615 },
    { city: 'Брест', label: 'Брест', lat: 52.0975, lng: 23.7340 },
    { city: 'Гомель', label: 'Гомель', lat: 52.4345, lng: 30.9754 },
    { city: 'Витебск', label: 'Витебск', lat: 55.1904, lng: 30.2049 },
    { city: 'Гродно', label: 'Гродно', lat: 53.6693, lng: 23.8131 },
    { city: 'Могилёв', label: 'Могилёв', lat: 53.9007, lng: 30.3313 },
  ];

  res.json({ items: presetLocations });
});

export default router;
