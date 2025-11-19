const R = 6371; // Radius of the Earth in kilometers

function deg2rad(value) {
  return (value * Math.PI) / 180;
const RADIUS_OF_EARTH_KM = 6371;

function deg2rad(deg) {
  return (deg * Math.PI) / 180;
}

function getDistanceKm(lat1, lng1, lat2, lng2) {
  if (
    [lat1, lng1, lat2, lng2].some(
      (value) => typeof value !== 'number' || Number.isNaN(value)
    )
  ) {
    return null;
    return NaN;
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

  return R * c;
}

module.exports = { getDistanceKm };

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return RADIUS_OF_EARTH_KM * c;
}

module.exports = { getDistanceKm };

  return EARTH_RADIUS_KM * c;
}

module.exports = {
  getDistanceKm,
};
