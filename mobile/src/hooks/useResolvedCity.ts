import { useCallback, useEffect, useState } from 'react';

const CITY_STORAGE_KEY = 'kufar-mobile-city';

const getStoredCity = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(CITY_STORAGE_KEY);
};

const setStoredCity = (code: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CITY_STORAGE_KEY, code);
};

const resolveCityFromHostname = () => {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (parts.length > 2) {
    return parts[0];
  }
  if (hostname.includes('localhost')) {
    return null;
  }
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return parts[0];
  }
  return null;
};

export function useResolvedCity(): { cityCode: string; setCityCode: (code: string) => void } {
  const [cityCode, setCityCodeState] = useState<string>('global');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paramCity = params.get('city');

    if (paramCity) {
      setCityCodeState(paramCity);
      setStoredCity(paramCity);
      return;
    }

    const saved = getStoredCity();
    if (saved) {
      setCityCodeState(saved);
      return;
    }

    const hostnameCity = resolveCityFromHostname();
    if (hostnameCity) {
      setCityCodeState(hostnameCity);
      setStoredCity(hostnameCity);
      return;
    }

    setCityCodeState('global');
  }, []);

  const setCityCode = useCallback((code: string) => {
    setCityCodeState(code);
    setStoredCity(code);
  }, []);

  return { cityCode, setCityCode };
}
