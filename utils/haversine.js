const EARTH_RADIUS_KM = 6371; // радиус Земли в километрах

function deg2rad(value) {
  return (value * Math.PI) / 180;
}

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

export { deg2rad, haversineDistanceKm };
