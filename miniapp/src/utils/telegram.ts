import type { LocationData } from '../types/telegram';

export function getTelegramWebApp() {
  return window.Telegram?.WebApp;
}

export function getTelegramContext() {
  const WebApp = getTelegramWebApp();
  return {
    WebApp,
    initData: WebApp?.initData,
    initDataUnsafe: WebApp?.initDataUnsafe,
    themeParams: WebApp?.themeParams,
  };
}

export function parseAppMode(search: string) {
  const params = new URLSearchParams(search);
  return {
    niche: params.get('niche') || undefined,
    season: params.get('season') || undefined,
  };
}

export function openExternalLink(url: string) {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.openLink(url, { try_instant_view: true });
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

export function requestLocation(): Promise<LocationData | null> {
  return new Promise((resolve) => {
    const tg = getTelegramWebApp();
    
    if (!tg || !tg.LocationManager) {
      console.warn('Telegram WebApp LocationManager not available');
      resolve(null);
      return;
    }

    try {
      tg.LocationManager.getLocation((locationData) => {
        if (locationData && locationData.latitude && locationData.longitude) {
          console.log('📍 Location received:', locationData);
          resolve(locationData);
        } else {
          console.warn('📍 Location request cancelled or failed');
          resolve(null);
        }
      });
    } catch (error) {
      console.error('Error requesting location:', error);
      resolve(null);
    }
  });
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const EARTH_RADIUS_KM = 6371;
  const deg2rad = (deg: number) => (deg * Math.PI) / 180;

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

export function formatDistance(distanceKm: number | null | undefined): string {
  if (distanceKm == null || !Number.isFinite(distanceKm)) {
    return '';
  }

  if (distanceKm < 0.1) {
    return '< 100 м';
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 100) * 10} м`;
  }

  return `${distanceKm.toFixed(1)} км`;
}
