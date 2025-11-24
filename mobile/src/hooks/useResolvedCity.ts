import { useEffect, useState } from 'react';
import { cityApi, City } from '../api/cityApi';

const CITY_KEY = 'kufar-mobile:city';

export function useResolvedCity() {
  const [city, setCity] = useState<City | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(CITY_KEY);
    if (stored) {
      setCity(JSON.parse(stored));
      setLoading(false);
    } else {
      resolveCity('global');
    }
  }, []);

  const resolveCity = async (code: string) => {
    try {
      const { data } = await cityApi.getCity(code);
      setCity(data);
      localStorage.setItem(CITY_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to resolve city', error);
      const fallback: City = { code: 'global', name: 'Вся Беларусь' };
      setCity(fallback);
      localStorage.setItem(CITY_KEY, JSON.stringify(fallback));
    } finally {
      setLoading(false);
    }
  };

  const changeCity = (next: City) => {
    setCity(next);
    localStorage.setItem(CITY_KEY, JSON.stringify(next));
  };

  return { city, loading, changeCity, resolveCity };
}
