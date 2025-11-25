import express from 'express';
import { Router } from 'express';
import Ad from '../../models/Ad.js';
import { haversineDistanceKm } from '../../utils/haversine.js';
import HotSearchService from '../../services/HotSearchService.js';

const router = Router();
const DEFAULT_LIMIT = 100;
const FETCH_LIMIT = 500;

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

export default router;
