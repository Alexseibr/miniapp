import City from '../models/City.js';

const DEFAULT_CITY_CODE = 'brest';

export async function resolveCityCode(options = {}) {
  const { initData, ipAddress, geoCoordinates, preferredCity } = options;

  if (preferredCity) {
    const city = await City.findOne({
      code: preferredCity.toLowerCase().trim(),
      isActive: true,
    });
    if (city) {
      return city.code;
    }
  }

  if (initData?.user?.language_code) {
    const langToCityMap = {
      'be': 'brest',
      'ru': 'minsk',
    };
    const cityCode = langToCityMap[initData.user.language_code];
    if (cityCode) {
      const city = await City.findOne({ code: cityCode, isActive: true });
      if (city) {
        return city.code;
      }
    }
  }

  if (geoCoordinates?.lat && geoCoordinates?.lng) {
    const cityCode = await resolveCityByGeo(geoCoordinates.lat, geoCoordinates.lng);
    if (cityCode) {
      return cityCode;
    }
  }

  return DEFAULT_CITY_CODE;
}

async function resolveCityByGeo(lat, lng) {
  const cityCoordinates = {
    minsk: { lat: 53.9, lng: 27.56, radius: 50 },
    brest: { lat: 52.09, lng: 23.68, radius: 50 },
    grodno: { lat: 53.67, lng: 23.83, radius: 50 },
  };

  for (const [cityCode, coords] of Object.entries(cityCoordinates)) {
    const distance = haversineDistance(lat, lng, coords.lat, coords.lng);
    if (distance <= coords.radius) {
      const city = await City.findOne({ code: cityCode, isActive: true });
      if (city) {
        return city.code;
      }
    }
  }

  return null;
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

export function validateCityCode(cityCode) {
  if (!cityCode || typeof cityCode !== 'string') {
    return DEFAULT_CITY_CODE;
  }

  const normalized = cityCode.toLowerCase().trim();
  
  const validCities = ['brest', 'minsk', 'grodno'];
  if (validCities.includes(normalized)) {
    return normalized;
  }

  return DEFAULT_CITY_CODE;
}
