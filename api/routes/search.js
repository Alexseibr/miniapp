const express = require('express');
const Ad = require('../../models/Ad');
const { haversineDistanceKm } = require('../../utils/haversine');

const router = express.Router();
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
    case 'price_asc':
      return sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    case 'price_desc':
      return sorted.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    case 'distance':
      if (hasGeoContext) {
        return sorted.sort((a, b) => {
          if (a.distance == null && b.distance == null) return 0;
          if (a.distance == null) return 1;
          if (b.distance == null) return -1;
          return a.distance - b.distance;
        });
      }
      return sorted;
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

          return {
            ...ad,
            distance: roundedDistance,
          };
        })
        .filter(Boolean);
    } else {
      filtered = filtered.map((ad) => ({ ...ad, distance: null }));
    }

    const totalMatches = filtered.length;
    const sortedItems = sortItems(filtered, sort, hasGeo);
    const limitedItems = sortedItems.slice(0, limitNumber);

    res.json({
      items: limitedItems,
      count: totalMatches,
    });
  } catch (error) {
    console.error('GET /api/ads/search error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
