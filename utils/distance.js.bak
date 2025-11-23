const { haversineDistanceKm: rawHaversineDistanceKm } = require('./haversine');

function normalizePoint(point) {
  if (!point || typeof point !== 'object') {
    return null;
  }

  const lat = Number(point.lat);
  const lng = Number(point.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function haversineDistanceKm(pointA, pointB) {
  const normalizedA = normalizePoint(pointA);
  const normalizedB = normalizePoint(pointB);

  if (!normalizedA || !normalizedB) {
    return null;
  }

  return rawHaversineDistanceKm(
    normalizedA.lat,
    normalizedA.lng,
    normalizedB.lat,
    normalizedB.lng
  );
}

module.exports = {
  haversineDistanceKm,
};
