import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

const CITY_STORAGE_KEY = 'kufar-city-code';

const getCityFromSubdomain = (hostname: string): string | null => {
  const parts = hostname.split('.');
  if (parts.length < 2) return null;
  const subdomain = parts[0];
  if (!subdomain || subdomain === 'www' || subdomain === 'localhost') return null;
  return subdomain;
};

export const useResolvedCity = (): {
  cityCode: string;
  setCityCode: (code: string) => void;
} => {
  const location = useLocation();
  const [cityCode, setCityCodeState] = useState<string>('global');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(location.search);
    const cityFromQuery = params.get('city');
    const stored = localStorage.getItem(CITY_STORAGE_KEY);
    const subdomainCity = getCityFromSubdomain(window.location.hostname);

    if (cityFromQuery) {
      setCityCodeState(cityFromQuery);
      localStorage.setItem(CITY_STORAGE_KEY, cityFromQuery);
      return;
    }

    if (stored) {
      setCityCodeState(stored);
      return;
    }

    if (subdomainCity) {
      setCityCodeState(subdomainCity);
      localStorage.setItem(CITY_STORAGE_KEY, subdomainCity);
      return;
    }

    setCityCodeState('global');
  }, [location.search]);

  const setCityCode = useMemo(
    () => (code: string) => {
      setCityCodeState(code);
      if (typeof window !== 'undefined') {
        localStorage.setItem(CITY_STORAGE_KEY, code);
      }
    },
    [],
  );

  return { cityCode, setCityCode };
};
