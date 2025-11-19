const EARTH_RADIUS_KM = 6371; // радиус Земли в км

function deg2rad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Расстояние между двумя точками в км
 * lat1, lng1 — точка пользователя
 * lat2, lng2 — точка объявления
 */
function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const values = [lat1, lng1, lat2, lng2];

  if (!values.every((value) => typeof value === 'number' && Number.isFinite(value))) {
    return null;
  }

  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

module.exports = {
  haversineDistanceKm,
};
