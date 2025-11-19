import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { listAds, listNearbyAds } from '@/api/ads';
import AdCard from '@/components/AdCard';
import EmptyState from '@/widgets/EmptyState';
import { AdPreview } from '@/types';
import { useGeo } from '@/utils/geo';

const SORT_LABELS: Record<string, string> = {
  newest: 'Новые',
  cheapest: 'Дешевле',
  expensive: 'Дороже',
  distance: 'Рядом',
};

export default function FeedPage() {
  const { search: locationSearch } = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(locationSearch), [locationSearch]);
  const [ads, setAds] = useState<AdPreview[]>([]);
  const [sort, setSort] = useState<'newest' | 'cheapest' | 'expensive' | 'distance'>('newest');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { coords, requestLocation, status, radiusKm, setRadius } = useGeo();

  const params = useMemo(
    () => ({
      sort,
      search,
      categoryId: searchParams.get('categoryId') || undefined,
      subcategoryId: searchParams.get('subcategoryId') || undefined,
      seasonCode: searchParams.get('season') || undefined,
    }),
    [sort, search, searchParams]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = sort === 'distance' && coords
          ? await listNearbyAds({
              lat: coords.lat,
              lng: coords.lng,
              radiusKm,
              sort: 'distance',
              q: search,
              limit: 40,
              categoryId: params.categoryId,
              subcategoryId: params.subcategoryId,
              seasonCode: params.seasonCode,
            })
          : await listAds({
              sort,
              q: search,
              limit: 40,
              lat: coords?.lat,
              lng: coords?.lng,
              categoryId: params.categoryId,
              subcategoryId: params.subcategoryId,
              seasonCode: params.seasonCode,
            });
        if (!cancelled) {
          const items = response.items || [];
          const normalized =
            sort === 'cheapest'
              ? [...items].sort((a, b) => a.price - b.price)
              : sort === 'expensive'
                ? [...items].sort((a, b) => b.price - a.price)
                : items;
          setAds(normalized);
        }
      } catch (error) {
        console.error('feed error', error);
        if (!cancelled) {
          setAds([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [params, coords, radiusKm]);

  return (
    <div className="container">
      <section className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Фильтры</h3>
        <input
          type="search"
          placeholder="Поиск по названию или описанию"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #d0d5dd', marginBottom: 12 }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(SORT_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={sort === key ? 'primary' : 'secondary'}
              onClick={() => {
                if (key === 'distance' && !coords) {
                  requestLocation();
                }
                setSort(key as typeof sort);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {sort === 'distance' && (
          <div style={{ marginTop: 16 }}>
            <label htmlFor="radius" style={{ display: 'block', marginBottom: 4 }}>
              Радиус поиска: {radiusKm} км
            </label>
            <input
              id="radius"
              type="range"
              min={1}
              max={50}
              step={1}
              value={radiusKm}
              onChange={(event) => setRadius(Number(event.target.value))}
              style={{ width: '100%' }}
            />
            {status !== 'ready' && (
              <p style={{ marginTop: 8, color: '#475467' }}>
                {status === 'loading' ? 'Получаем координаты…' : 'Включите геолокацию для точных рекомендаций.'}
              </p>
            )}
          </div>
        )}
      </section>

      {loading ? (
        <EmptyState title="Загружаем объявления" description="Подождите немного" />
      ) : ads.length ? (
        <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
          {ads.map((ad) => (
            <AdCard key={ad._id} ad={ad} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Объявлений не найдено"
          description="Попробуйте изменить фильтры или выбрать другую категорию"
          action={
            sort === 'distance' ? (
              <button type="button" className="secondary" onClick={requestLocation}>
                Обновить координаты
              </button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
