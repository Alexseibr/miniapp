import React, { useEffect, useState } from 'react';
import { LayoutRenderer } from '../components/layout/LayoutRenderer';
import { useResolvedCity } from '../hooks/useResolvedCity';
import { fetchLayout } from '../api/layoutApi';
import { fetchNearbyAds, fetchSeasonAds, fetchTrendingAds } from '../api/adsApi';
import type { LayoutBlock, LayoutResponse } from '../types/layout';
import type { Ad } from '../types/ad';
import { fetchCityConfig } from '../api/cityApi';
import { useTheme } from '../theme/ThemeProvider';

const SCREEN = 'home';

export const HomePage: React.FC = () => {
  const { cityCode } = useResolvedCity();
  const { setTheme, resetTheme } = useTheme();
  const [layout, setLayout] = useState<LayoutResponse | null>(null);
  const [adsBySource, setAdsBySource] = useState<Record<string, Ad[]>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'ready' | 'empty'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const cityConfig = await fetchCityConfig(cityCode);
        setTheme({ primaryColor: cityConfig.theme?.primaryColor || '#16a34a', cityName: cityConfig.name });
      } catch (error) {
        resetTheme();
      }
    };

    if (cityCode) {
      loadTheme();
    }
  }, [cityCode, resetTheme, setTheme]);

  useEffect(() => {
    const load = async () => {
      setStatus('loading');
      setErrorMessage('');

      try {
        const layoutResponse = await fetchLayout(cityCode, SCREEN);
        handleLayoutSuccess(layoutResponse);
      } catch (error: any) {
        if (cityCode !== 'global') {
          try {
            const fallbackLayout = await fetchLayout('global', SCREEN);
            handleLayoutSuccess(fallbackLayout);
          } catch (fallbackError: any) {
            setStatus('error');
            setErrorMessage(fallbackError?.message || 'Не удалось загрузить layout');
          }
        } else {
          setStatus('error');
          setErrorMessage(error?.message || 'Не удалось загрузить layout');
        }
      }
    };

    const handleLayoutSuccess = async (layoutResponse: LayoutResponse) => {
      setLayout(layoutResponse);
      if (!layoutResponse.blocks?.length) {
        setStatus('empty');
        return;
      }
      setStatus('ready');
      await loadAds(layoutResponse.blocks);
    };

    load();
  }, [cityCode]);

  const loadAds = async (blocks: LayoutBlock[]) => {
    if (!blocks.length) return;
    const sources = Array.from(
      new Set(blocks.filter((b) => b.type === 'ad_list' && b.source).map((b) => b.source as string))
    );
    const result: Record<string, Ad[]> = {};

    for (const source of sources) {
      try {
        if (source === 'trending_city') {
          result[source] = await fetchTrendingAds(cityCode);
          continue;
        }

        if (source === 'trending_global') {
          result[source] = await fetchTrendingAds();
          continue;
        }

        if (source === 'nearby') {
          const position = await requestGeolocation();
          if (position) {
            const { latitude, longitude } = position.coords;
            result[source] = await fetchNearbyAds(latitude, longitude, 25);
          } else {
            result[source] = [];
          }
          continue;
        }

        if (source.startsWith('season_')) {
          const seasonCode = source.replace('season_', '');
          result[source] = await fetchSeasonAds(seasonCode);
          continue;
        }
      } catch (error) {
        result[source] = [];
      }
    }

    setAdsBySource(result);
  };

  const requestGeolocation = async (): Promise<GeolocationPosition | null> => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        () => resolve(null),
        { maximumAge: 60_000, timeout: 5_000 }
      );
    });
  };

  const handleAdClick = (ad: Ad) => {
    // TODO: implement navigation to ad page
    console.log('Ad click', ad);
  };

  const handleCategoryClick = (categoryId: string) => {
    // TODO: navigate to category page
    console.log('Category click', categoryId);
  };

  if (status === 'loading') {
    return <p className="text-sm text-slate-600">Загружаем витрину...</p>;
  }

  if (status === 'error') {
    return (
      <div className="card-surface p-4 text-sm text-slate-700">
        <p>Ошибка: {errorMessage}</p>
        <button
          className="button-primary mt-3 w-full"
          onClick={() => {
            setLayout(null);
            setStatus('idle');
          }}
        >
          Повторить
        </button>
      </div>
    );
  }

  if (status === 'empty') {
    return <p className="text-sm text-slate-600">Пока нет блоков для этого города</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {layout?.blocks && layout.blocks.length > 0 ? (
        <LayoutRenderer
          blocks={layout.blocks}
          adsBySource={adsBySource}
          onAdClick={handleAdClick}
          onCategoryClick={handleCategoryClick}
        />
      ) : (
        <p className="text-sm text-slate-600">Нет данных для отображения</p>
      )}
    </div>
  );
};
