import { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { listAds, listNearbyAds } from '@/api/ads';
import { fetchCategories } from '@/api/categories';
import AdCard from '@/components/AdCard';
import FilterDrawer from '@/components/FilterDrawer';
import SeasonBanners from '@/components/SeasonBanners';
import CategoryScroll from '@/components/CategoryScroll';
import EmptyState from '@/widgets/EmptyState';
import { AdPreview, CategoryNode } from '@/types';
import { useGeo } from '@/utils/geo';
import { SlidersHorizontal } from 'lucide-react';

export default function FeedPage() {
  const { search: locationSearch } = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(locationSearch), [locationSearch]);
  const [ads, setAds] = useState<AdPreview[]>([]);
  const [sort, setSort] = useState<'newest' | 'cheapest' | 'expensive' | 'popular' | 'distance'>(() => {
    const sortParam = searchParams.get('sort');
    const validSorts = ['newest', 'cheapest', 'expensive', 'popular', 'distance'];
    return sortParam && validSorts.includes(sortParam) ? (sortParam as 'newest' | 'cheapest' | 'expensive' | 'popular' | 'distance') : 'newest';
  });
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [minPrice, setMinPrice] = useState<string>(() => searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState<string>(() => searchParams.get('maxPrice') || '');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const { coords, requestLocation, status, radiusKm, setRadius } = useGeo();

  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    const sortParam = searchParams.get('sort');
    const validSorts = ['newest', 'cheapest', 'expensive', 'popular', 'distance'];
    if (sortParam && validSorts.includes(sortParam)) {
      setSort(sortParam as typeof sort);
    }
    setSearch(searchParams.get('q') || '');
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
  }, [locationSearch]);

  const params = useMemo(
    () => ({
      sort,
      search,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      subcategoryId: searchParams.get('subcategoryId') || undefined,
      seasonCode: searchParams.get('season') || undefined,
    }),
    [sort, search, minPrice, maxPrice, searchParams]
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
              minPrice: params.minPrice,
              maxPrice: params.maxPrice,
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
              minPrice: params.minPrice,
              maxPrice: params.maxPrice,
              categoryId: params.categoryId,
              subcategoryId: params.subcategoryId,
              seasonCode: params.seasonCode,
            });
        if (!cancelled) {
          setAds(response.items || []);
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

  const topCategories = useMemo(() => categories.slice(0, 6), [categories]);

  return (
    <div>
      <div
        style={{
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
          zIndex: 10,
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              className="input"
              type="search"
              placeholder="Поиск объявлений"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search"
            />
          </div>
          <button
            className="secondary"
            type="button"
            onClick={() => setShowFilters(true)}
            data-testid="button-open-filters"
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {topCategories.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <CategoryScroll categories={topCategories} />
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <SeasonBanners />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
          <button
            className="secondary"
            style={{ whiteSpace: 'nowrap', padding: '8px 16px', fontSize: 14 }}
            data-testid="button-filter-categories"
          >
            Категории
          </button>
          <button
            className="secondary"
            style={{ whiteSpace: 'nowrap', padding: '8px 16px', fontSize: 14 }}
            data-testid="button-filter-location"
          >
            Вся Беларусь
          </button>
          <button
            className="secondary"
            style={{ whiteSpace: 'nowrap', padding: '8px 16px', fontSize: 14 }}
            data-testid="button-filter-sort"
          >
            По новизне
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <button
            className="primary"
            style={{ 
              padding: '16px', 
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}
            data-testid="button-all-ads"
          >
            <span style={{ fontSize: 16, fontWeight: 600 }}>Всего</span>
            <span style={{ fontSize: 14, opacity: 0.9 }}>{ads.length} объявлений</span>
          </button>
          <button
            className="primary"
            style={{ 
              padding: '16px', 
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              backgroundColor: '#10b981'
            }}
            data-testid="button-company-ads"
          >
            <span style={{ fontSize: 16, fontWeight: 600 }}>Товары компаний</span>
            <span style={{ fontSize: 14, opacity: 0.9 }}>0 объявлений</span>
          </button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }} data-testid="text-all-ads-title">Все объявления</h2>
        </div>

        {loading ? (
          <EmptyState title="Загружаем объявления" description="Подождите немного" />
        ) : ads.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                <button type="button" className="secondary" onClick={requestLocation} data-testid="button-update-location">
                  Обновить координаты
                </button>
              ) : undefined
            }
          />
        )}
      </div>

      <FilterDrawer
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        minPrice={minPrice}
        maxPrice={maxPrice}
        sort={sort}
        onMinPriceChange={setMinPrice}
        onMaxPriceChange={setMaxPrice}
        onSortChange={(newSort) => {
          setSort(newSort as typeof sort);
          if (newSort === 'distance' && !coords) {
            requestLocation();
          }
        }}
        onRequestLocation={requestLocation}
        coords={coords}
        radiusKm={radiusKm}
        onRadiusChange={setRadius}
        geoStatus={status}
      />
    </div>
  );
}
