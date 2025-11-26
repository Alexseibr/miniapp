import express from 'express';
import { Router } from 'express';
import Ad from '../../models/Ad.js';
import Category from '../../models/Category.js';
import { haversineDistanceKm } from '../../utils/haversine.js';
import HotSearchService from '../../services/HotSearchService.js';
import SearchAlertService from '../../services/SearchAlertService.js';
import DemandNotificationService from '../../services/DemandNotificationService.js';

const router = Router();
const DEFAULT_LIMIT = 100;
const FETCH_LIMIT = 500;

let hiddenCategorySlugsCache = null;
let hiddenCategoryCacheTime = 0;
const HIDDEN_CATEGORY_CACHE_DURATION = 5 * 60 * 1000;

async function getHiddenCategorySlugs() {
  const now = Date.now();
  if (hiddenCategorySlugsCache && (now - hiddenCategoryCacheTime) < HIDDEN_CATEGORY_CACHE_DURATION) {
    return hiddenCategorySlugsCache;
  }
  
  try {
    const hiddenCategories = await Category.find({ visible: false }, { slug: 1 }).lean();
    hiddenCategorySlugsCache = hiddenCategories.map(c => c.slug);
    hiddenCategoryCacheTime = now;
    return hiddenCategorySlugsCache;
  } catch (error) {
    console.error('Error fetching hidden categories:', error);
    return hiddenCategorySlugsCache || [];
  }
}

function parseNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getAttributeValues(attributes) {
  if (!attributes) {
    return [];
  }

  if (attributes instanceof Map) {
    return Array.from(attributes.values());
  }

  if (typeof attributes === 'object') {
    return Object.values(attributes);
  }

  return [];
}

function matchesQuery(ad, regex) {
  if (!regex) {
    return true;
  }

  if (regex.test(ad.title || '') || regex.test(ad.description || '')) {
    return true;
  }

  return getAttributeValues(ad.attributes).some(
    (value) => typeof value === 'string' && regex.test(value)
  );
}

function sortItems(items, sortKey, hasGeoContext) {
  const sorted = [...items];
  switch (sortKey) {
    case 'cheapest':
    case 'price_asc':
      return sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    case 'expensive':
    case 'price_desc':
      return sorted.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    case 'distance':
      if (hasGeoContext) {
        return sorted.sort((a, b) => {
          if (a.distanceKm == null && b.distanceKm == null) return 0;
          if (a.distanceKm == null) return 1;
          if (b.distanceKm == null) return -1;
          return a.distanceKm - b.distanceKm;
        });
      }
      return sorted;
    case 'popular':
      return sorted.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    case 'newest':
    default:
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }
}

router.get('/search', async (req, res) => {
  try {
    const {
      q,
      categoryId,
      subcategoryId,
      seasonCode,
      lat,
      lng,
      maxDistanceKm,
      minPrice,
      maxPrice,
      sort = 'newest',
      limit,
    } = req.query;

    const limitNumber = Math.min(parseNumber(limit) || DEFAULT_LIMIT, DEFAULT_LIMIT);

    const baseQuery = {
      status: 'active',
      moderationStatus: 'approved',
    };

    if (categoryId) baseQuery.categoryId = categoryId;
    if (subcategoryId) baseQuery.subcategoryId = subcategoryId;
    if (seasonCode) baseQuery.seasonCode = seasonCode;

    // Исключаем объявления из скрытых категорий (быстрый маркет)
    // Только если не указаны конкретные категории
    if (!categoryId && !subcategoryId) {
      const hiddenSlugs = await getHiddenCategorySlugs();
      if (hiddenSlugs.length > 0) {
        baseQuery.$and = [
          { categoryId: { $nin: hiddenSlugs } },
          { subcategoryId: { $nin: hiddenSlugs } },
        ];
      }
    }

    const minPriceNumber = parseNumber(minPrice);
    const maxPriceNumber = parseNumber(maxPrice);
    if (minPriceNumber != null && Number.isFinite(minPriceNumber)) {
      baseQuery.price = { ...baseQuery.price, $gte: minPriceNumber };
    }
    if (maxPriceNumber != null && Number.isFinite(maxPriceNumber)) {
      baseQuery.price = { ...baseQuery.price, $lte: maxPriceNumber };
    }

    const ads = await Ad.find(baseQuery).sort({ createdAt: -1 }).limit(FETCH_LIMIT).lean();

    const regex = q ? new RegExp(q, 'i') : null;
    let filtered = regex ? ads.filter((ad) => matchesQuery(ad, regex)) : ads;

    const latNumber = parseNumber(lat);
    const lngNumber = parseNumber(lng);
    const hasGeo = Number.isFinite(latNumber) && Number.isFinite(lngNumber);
    const maxDistanceNumber = parseNumber(maxDistanceKm);

    if (hasGeo) {
      filtered = filtered
        .map((ad) => {
          if (!ad.location || ad.location.lat == null || ad.location.lng == null) {
            return null;
          }

          const distanceKm = haversineDistanceKm(
            latNumber,
            lngNumber,
            Number(ad.location.lat),
            Number(ad.location.lng)
          );

          if (distanceKm == null) {
            return null;
          }

          const roundedDistance = Number(distanceKm.toFixed(2));
          if (
            maxDistanceNumber != null &&
            Number.isFinite(maxDistanceNumber) &&
            roundedDistance > maxDistanceNumber
          ) {
            return null;
          }

          const { distance, ...adWithoutDistance } = ad;
          return {
            ...adWithoutDistance,
            distanceKm: roundedDistance,
          };
        })
        .filter(Boolean);
    } else {
      filtered = filtered.map((ad) => {
        const { distance, ...adWithoutDistance } = ad;
        return { ...adWithoutDistance, distanceKm: null };
      });
    }

    const totalMatches = filtered.length;
    const sortedItems = sortItems(filtered, sort, hasGeo);
    const limitedItems = sortedItems.slice(0, limitNumber);

    if (q && q.trim().length >= 2) {
      HotSearchService.logSearch({
        query: q,
        userId: req.user?._id || null,
        lat: latNumber,
        lng: lngNumber,
        resultsCount: totalMatches,
      }).catch(err => console.error('[Search] Log error:', err.message));
    }

    res.json({
      items: limitedItems,
      count: totalMatches,
    });
  } catch (error) {
    console.error('GET /api/ads/search error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/hot', async (req, res) => {
  try {
    const { lat, lng, limit = '10', scope = 'local' } = req.query;

    const latNumber = parseNumber(lat);
    const lngNumber = parseNumber(lng);
    const limitNumber = Math.min(parseInt(limit, 10) || 10, 20);

    let hotSearches;

    if (scope === 'country') {
      hotSearches = await HotSearchService.getHotSearchesCountryWide(limitNumber);
    } else {
      hotSearches = await HotSearchService.getHotSearches({
        lat: latNumber,
        lng: lngNumber,
        limit: limitNumber,
        countryWide: false,
      });
    }

    res.json({
      ok: true,
      searches: hotSearches,
      scope: scope === 'country' ? 'country' : 'local',
    });
  } catch (error) {
    console.error('GET /api/search/hot error:', error);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

router.post('/alerts', async (req, res) => {
  try {
    const { telegramId, query, detectedCategoryId, lat, lng, radiusKm, citySlug } = req.body;
    
    if (!telegramId) {
      return res.status(400).json({ ok: false, error: 'telegramId обязателен' });
    }
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ ok: false, error: 'Запрос должен содержать минимум 2 символа' });
    }
    
    const alert = await SearchAlertService.createOrUpdateAlert({
      telegramId,
      query,
      detectedCategoryId,
      lat: parseNumber(lat),
      lng: parseNumber(lng),
      radiusKm: parseNumber(radiusKm) || 5,
      citySlug,
    });
    
    res.json({
      ok: true,
      alert: {
        _id: alert._id,
        query: alert.query,
        normalizedQuery: alert.normalizedQuery,
        isActive: alert.isActive,
        createdAt: alert.createdAt,
      },
      message: 'Подписка на уведомления создана',
    });
  } catch (error) {
    console.error('POST /api/search/alerts error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Server error' });
  }
});

router.get('/alerts/my', async (req, res) => {
  try {
    const { telegramId, activeOnly = 'true', limit = '20', skip = '0' } = req.query;
    
    if (!telegramId) {
      return res.status(400).json({ ok: false, error: 'telegramId обязателен' });
    }
    
    const alerts = await SearchAlertService.getMyAlerts(parseNumber(telegramId), {
      activeOnly: activeOnly === 'true',
      limit: Math.min(parseNumber(limit) || 20, 50),
      skip: parseNumber(skip) || 0,
    });
    
    res.json({
      ok: true,
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error('GET /api/search/alerts/my error:', error);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

router.post('/alerts/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    const { telegramId } = req.body;
    
    if (!telegramId) {
      return res.status(400).json({ ok: false, error: 'telegramId обязателен' });
    }
    
    const alert = await SearchAlertService.deactivateAlert(id, parseNumber(telegramId));
    
    if (!alert) {
      return res.status(404).json({ ok: false, error: 'Подписка не найдена' });
    }
    
    res.json({
      ok: true,
      alert: {
        _id: alert._id,
        isActive: alert.isActive,
      },
      message: 'Подписка отключена',
    });
  } catch (error) {
    console.error('POST /api/search/alerts/:id/deactivate error:', error);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

router.get('/demand/local', async (req, res) => {
  try {
    const { lat, lng, radiusKm = '10', limit = '10' } = req.query;
    
    const latNumber = parseNumber(lat);
    const lngNumber = parseNumber(lng);
    
    if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) {
      return res.status(400).json({ ok: false, error: 'lat и lng обязательны' });
    }
    
    const trends = await DemandNotificationService.getLocalDemandTrends(
      latNumber,
      lngNumber,
      parseNumber(radiusKm) || 10,
      Math.min(parseNumber(limit) || 10, 20)
    );
    
    res.json({
      ok: true,
      trends,
      count: trends.length,
    });
  } catch (error) {
    console.error('GET /api/search/demand/local error:', error);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

export default router;
