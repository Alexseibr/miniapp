import React, { useEffect, useMemo, useState } from 'react';
import type { LayoutBlock } from '../types/layout';
import type { Ad } from '../types/ad';
import { LayoutRenderer } from '../components/layout/LayoutRenderer';
import { useResolvedCity } from '../hooks/useResolvedCity';
import { fetchLayout } from '../api/layoutApi';
import { fetchTrendingAds, fetchNearbyAds, fetchSeasonAds } from '../api/adsApi';
import { fetchCityConfig } from '../api/cityApi';
import { useTheme } from '../theme/ThemeProvider';

const getUserLocation = (): Promise<{ lat: number; lng: number } | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => resolve(null),
      { timeout: 3000 },
    );
  });
};

export const HomePage: React.FC = () => {
  const { cityCode } = useResolvedCity();
  const { applyCityTheme } = useTheme();
  const [layoutBlocks, setLayoutBlocks] = useState<LayoutBlock[]>([]);
  const [adsBySource, setAdsBySource] = useState<Record<string, Ad[]>>({});
  const [loadingLayout, setLoadingLayout] = useState(false);
  const [loadingAds, setLoadingAds] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const layoutScreen = useMemo(() => 'home', []);

  const loadLayout = async (targetCity: string) => {
    setLoadingLayout(true);
    setError(null);
    try {
      const layout = await fetchLayout(targetCity, layoutScreen);
      setLayoutBlocks(layout.blocks || []);
      await loadCityTheme(layout.cityCode);
      await loadAds(layout.blocks || [], layout.cityCode);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        try {
          const fallbackLayout = await fetchLayout('global', layoutScreen);
          setLayoutBlocks(fallbackLayout.blocks || []);
          await loadCityTheme(fallbackLayout.cityCode);
          await loadAds(fallbackLayout.blocks || [], fallbackLayout.cityCode);
        } catch (fallbackError: any) {
          setError('Не удалось загрузить экран.');
          setLayoutBlocks([]);
          console.error(fallbackError);
        }
      } else {
        setError('Не удалось загрузить экран.');
        setLayoutBlocks([]);
        console.error(err);
      }
    } finally {
      setLoadingLayout(false);
    }
  };

  const loadCityTheme = async (code: string) => {
    try {
      const cityConfig = await fetchCityConfig(code);
      applyCityTheme(cityConfig);
    } catch (themeError) {
      console.warn('City theme not loaded', themeError);
      applyCityTheme();
    }
  };

  const loadAds = async (blocks: LayoutBlock[], resolvedCity: string) => {
    const sources = Array.from(
      new Set(
        blocks
          .filter((b) => b.type === 'ad_list' && b.source)
          .map((b) => b.source as string),
      ),
    );

    if (!sources.length) {
      setAdsBySource({});
      return;
    }

    setLoadingAds(true);
    const updates: Record<string, Ad[]> = {};

    for (const source of sources) {
      try {
        if (source === 'trending_city') {
          updates[source] = await fetchTrendingAds(resolvedCity);
        } else if (source === 'trending_global') {
          updates[source] = await fetchTrendingAds();
        } else if (source === 'nearby') {
          const coords = await getUserLocation();
          if (coords) {
            updates[source] = await fetchNearbyAds(coords.lat, coords.lng, 25);
          } else {
            updates[source] = [];
          }
        } else if (source.startsWith('season_')) {
          const seasonCode = source.replace('season_', '');
          updates[source] = await fetchSeasonAds(seasonCode);
        } else {
          updates[source] = [];
        }
      } catch (adsError) {
        console.warn(`Cannot fetch ads for ${source}`, adsError);
        updates[source] = [];
      }
    }

    setAdsBySource(updates);
    setLoadingAds(false);
  };

  useEffect(() => {
    let canceled = false;
    const run = async () => {
      if (canceled) return;
      await loadLayout(cityCode);
    };
    run();
    return () => {
      canceled = true;
    };
  }, [cityCode]);

  const handleRetry = () => loadLayout(cityCode);

  const handleAdClick = (ad: Ad) => {
    console.log('Ad click', ad.id);
  };

  const handleCategoryClick = (categoryId: string) => {
    console.log('Category click', categoryId);
  };

  const isEmpty = !loadingLayout && !error && !layoutBlocks.length;

  return (
    <div className="mx-auto flex min-h-screen max-w-mobile flex-col bg-slate-50 px-3 pb-20 pt-4">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-slate-500">Ваш город</p>
          <p className="text-lg font-semibold text-slate-900">{cityCode}</p>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-xs text-primary shadow-sm">
          Mobile
        </div>
      </header>

      {loadingLayout && <div className="text-sm text-slate-500">Загружаем экран...</div>}

      {error && (
        <div className="rounded-xl bg-white p-4 text-center shadow-sm">
          <p className="text-sm text-red-600">{error}</p>
          <button
            className="mt-3 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
            onClick={handleRetry}
          >
            Повторить
          </button>
        </div>
      )}

      {isEmpty && <div className="text-sm text-slate-500">Нет блоков для отображения</div>}

      {!error && !!layoutBlocks.length && (
        <LayoutRenderer
          blocks={layoutBlocks}
          adsBySource={adsBySource}
          onAdClick={handleAdClick}
          onCategoryClick={handleCategoryClick}
        />
      )}

      {loadingAds && <div className="mt-4 text-sm text-slate-500">Готовим подборки...</div>}
    </div>
  );
};

