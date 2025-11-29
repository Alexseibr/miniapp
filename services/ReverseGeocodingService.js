import fetch from 'node-fetch';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const REQUEST_DELAY = 1100; // Nominatim requires 1 req/sec

class ReverseGeocodingService {
  constructor() {
    this.cache = new Map();
    this.lastRequestTime = 0;
  }

  getCacheKey(lat, lng) {
    const latRounded = Math.round(lat * 1000) / 1000;
    const lngRounded = Math.round(lng * 1000) / 1000;
    return `${latRounded},${lngRounded}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
    if (this.cache.size > 5000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  async delay() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < REQUEST_DELAY) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  isCoordinateString(value) {
    if (!value || typeof value !== 'string') return false;
    const coordPattern = /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/;
    return coordPattern.test(value.trim());
  }

  async reverseGeocode(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }

    const cacheKey = this.getCacheKey(lat, lng);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      await this.delay();

      const url = `${NOMINATIM_URL}?format=json&lat=${lat}&lon=${lng}&accept-language=ru&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'KETMAR-Market/1.0'
        },
        timeout: 10000
      });

      if (!response.ok) {
        console.warn(`[ReverseGeo] Nominatim returned ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (!data || data.error) {
        console.warn('[ReverseGeo] Nominatim returned error:', data?.error);
        return null;
      }

      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.hamlet || null;
      const suburb = addr.suburb || addr.neighbourhood || addr.quarter || null;
      const village = addr.village || addr.hamlet || null;
      const district = addr.city_district || null;
      const state = addr.state || null;
      const country = addr.country || null;

      let geoLabel = '';

      if (village && !city) {
        geoLabel = `д. ${village}`;
        if (state) {
          geoLabel += `, ${state}`;
        }
      } else if (city && suburb) {
        geoLabel = `${city} (${suburb})`;
      } else if (city && district) {
        geoLabel = `${city} (${district})`;
      } else if (city) {
        geoLabel = city;
        if (state && state !== city) {
          geoLabel += `, ${state}`;
        }
      } else if (village) {
        geoLabel = `д. ${village}`;
      } else if (state) {
        geoLabel = state;
      } else if (country) {
        geoLabel = country;
      } else {
        geoLabel = 'Неизвестное место';
      }

      const result = {
        city: city || village || state || null,
        geoLabel,
        district: suburb || district || null,
        village: village && !city ? village : null,
        state,
        country,
        raw: data.display_name
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[ReverseGeo] Error:', error.message);
      return null;
    }
  }

  async ensureLocationData(payload) {
    if (!payload.location || !payload.location.lat || !payload.location.lng) {
      return payload;
    }

    const { lat, lng } = payload.location;
    const cityIsCoords = this.isCoordinateString(payload.city);
    const geoLabelIsCoords = this.isCoordinateString(payload.geoLabel);
    const needsGeocode = !payload.city || !payload.geoLabel || cityIsCoords || geoLabelIsCoords;

    if (!needsGeocode) {
      return payload;
    }

    console.log(`[ReverseGeo] Resolving location for coords: ${lat}, ${lng}`);
    
    const geoData = await this.reverseGeocode(lat, lng);
    
    if (geoData) {
      console.log(`[ReverseGeo] Resolved to: ${geoData.geoLabel}`);
      return {
        ...payload,
        city: geoData.city || payload.city,
        geoLabel: geoData.geoLabel || payload.geoLabel
      };
    }

    return payload;
  }
}

const reverseGeocodingService = new ReverseGeocodingService();

export default reverseGeocodingService;
export { ReverseGeocodingService };
