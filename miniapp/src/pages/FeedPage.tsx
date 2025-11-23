import { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { listAds, listNearbyAds } from '@/api/ads';
import { fetchCategories } from '@/api/categories';
import AdCard from '@/components/AdCard';
import EmptyState from '@/widgets/EmptyState';
import { AdPreview, CategoryNode } from '@/types';
import { useGeo } from '@/utils/geo';

const SORT_LABELS: Record<string, string> = {
  newest: 'Новые',
  cheapest: 'Дешевле',
  expensive: 'Дороже',
  popular: 'Популярные',
  distance: 'Рядом',
};

export default function FeedPage() {
  const { search: locationSearch } = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(locationSearch), [locationSearch]);
  const [ads, setAds] = useState<AdPreview[]>([]);
  const [sort, setSort] = useState<'newest' | 'cheapest' | 'expensive' | 'popular' | 'distance'>('newest');
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { coords, requestLocation, status, radiusKm, setRadius } = useGeo();

  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
  }, []);

  const suggestions = useMemo(() => {
    if (!search || search.length < 2) return [];
    
    const searchLower = search.toLowerCase();
    const results: Array<{ name: string; categoryId: string; subcategoryId?: string }> = [];
    
    categories.forEach((category) => {
      if (category.name.toLowerCase().includes(searchLower)) {
        results.push({ 
          name: category.name, 
          categoryId: category.slug 
        });
      }
      
      category.subcategories?.forEach((sub) => {
        if (sub.name.toLowerCase().includes(searchLower)) {
          results.push({
            name: `${category.name} → ${sub.name}`,
            categoryId: category.slug,
            subcategoryId: sub.slug,
          });
        }
      });
    });
    
    return results.slice(0, 5);
  }, [search, categories]);

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

  return (
    <div className="container">
      <section className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Фильтры</h3>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Поиск по названию, описанию или категории"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #d0d5dd' }}
            data-testid="input-search"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                backgroundColor: 'white',
                border: '1px solid #d0d5dd',
                borderRadius: 12,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 10,
                maxHeight: 240,
                overflowY: 'auto',
              }}
              data-testid="suggestions-dropdown"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    const newParams = new URLSearchParams(locationSearch);
                    newParams.set('categoryId', suggestion.categoryId);
                    if (suggestion.subcategoryId) {
                      newParams.set('subcategoryId', suggestion.subcategoryId);
                    } else {
                      newParams.delete('subcategoryId');
                    }
                    window.location.href = `/miniapp/?${newParams.toString()}`;
                  }}
                  style={{
                    width: '100%',
                    padding: 12,
                    textAlign: 'left',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    borderBottom: index < suggestions.length - 1 ? '1px solid #f2f4f7' : 'none',
                  }}
                  data-testid={`suggestion-${index}`}
                >
                  <div style={{ fontSize: 14, color: '#101828' }}>{suggestion.name}</div>
                  <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>Категория</div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="number"
            placeholder="Цена от"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid #d0d5dd' }}
            data-testid="input-min-price"
            min="0"
          />
          <input
            type="number"
            placeholder="Цена до"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid #d0d5dd' }}
            data-testid="input-max-price"
            min="0"
          />
        </div>

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
              data-testid={`button-sort-${key}`}
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
