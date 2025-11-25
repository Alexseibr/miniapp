import { useEffect } from 'react';
import useGeoStore from '@/store/useGeoStore';
import { updateUserLocation } from '@/api/users';

export function useGeo(syncWithBackend = true) {
  const coords = useGeoStore((state) => state.coords);
  const status = useGeoStore((state) => state.status);
  const error = useGeoStore((state) => state.error);
  const requestLocation = useGeoStore((state) => state.requestLocation);
  const setRadius = useGeoStore((state) => state.setRadius);
  const radiusKm = useGeoStore((state) => state.radiusKm);
  const cityName = useGeoStore((state) => state.cityName);
  const setCityName = useGeoStore((state) => state.setCityName);
  const setCoords = useGeoStore((state) => state.setCoords);
  const hasCompletedOnboarding = useGeoStore((state) => state.hasCompletedOnboarding);
  const completeOnboarding = useGeoStore((state) => state.completeOnboarding);
  const resetGeo = useGeoStore((state) => state.resetGeo);

  useEffect(() => {
    if (syncWithBackend && coords) {
      updateUserLocation(coords);
    }
  }, [coords, syncWithBackend]);

  return {
    coords,
    status,
    error,
    radiusKm,
    cityName,
    hasCompletedOnboarding,
    requestLocation,
    setRadius,
    setCityName,
    setCoords,
    completeOnboarding,
    resetGeo,
  };
}

export function formatDistance(distanceKm?: number): string {
  if (distanceKm == null || isNaN(distanceKm)) return '';

  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `📍 ${meters} м от вас`;
  }

  const value = Number(distanceKm.toFixed(1));
  return `📍 ${value} км от вас`;
}

export function formatCityDistance(city?: string | null, distanceKm?: number) {
  const cityPart = city || '';
  const distancePart = distanceKm != null
    ? (distanceKm < 1
        ? `📍 ${Math.round(distanceKm * 1000)} м от вас`
        : `📍 ${distanceKm.toFixed(1)} км от вас`)
    : '';
  
  return [cityPart, distancePart].filter(Boolean).join(' • ');
}

export function formatRadiusLabel(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} м`;
  }
  return `${km} км`;
}
