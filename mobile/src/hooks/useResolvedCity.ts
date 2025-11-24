import { useCallback, useEffect, useState } from 'react';
import { cityApi, City } from '../api/cityApi';

const CITY_KEY = 'kufar-mobile:city';
const CITY_CHANGE_EVENT = 'kufar-mobile:city-change';

function readStoredCity(): City | null {
  try {
    const stored = localStorage.getItem(CITY_KEY);
    return stored ? (JSON.parse(stored) as City) : null;
  } catch (error) {
    console.error('Failed to parse stored city', error);
    return null;
  }
}

function notifyCityChange() {
  window.dispatchEvent(new Event(CITY_CHANGE_EVENT));
}

export function useResolvedCity() {
  const [city, setCity] = useState<City | null>(() => readStoredCity());
  const [loading, setLoading] = useState(true);

  const persistCity = useCallback((next: City) => {
    setCity(next);
    localStorage.setItem(CITY_KEY, JSON.stringify(next));
    notifyCityChange();
  }, []);

  const resolveCity = useCallback(
    async (code: string) => {
      try {
        const { data } = await cityApi.getCity(code);
        persistCity(data);
      } catch (error) {
        console.error('Failed to resolve city', error);
        const fallback: City = { code: 'global', name: 'Вся Беларусь' };
        persistCity(fallback);
      } finally {
        setLoading(false);
      }
    },
    [persistCity]
  );

  const changeCity = useCallback(
    (next: City) => {
      persistCity(next);
    },
    [persistCity]
  );

  useEffect(() => {
    const stored = readStoredCity();
    if (stored) {
      setCity(stored);
      setLoading(false);
    } else {
      resolveCity('global');
    }
  }, [resolveCity]);

  useEffect(() => {
    const handleCityChange = () => {
      const storedCity = readStoredCity();
      if (storedCity) {
        setCity(storedCity);
      }
    };

    window.addEventListener(CITY_CHANGE_EVENT, handleCityChange);
    return () => window.removeEventListener(CITY_CHANGE_EVENT, handleCityChange);
  }, []);

  return { city, loading, changeCity, resolveCity };
}
