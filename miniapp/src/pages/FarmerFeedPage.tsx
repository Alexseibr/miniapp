import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, MapPin, Filter, Plus, Leaf, TrendingUp } from 'lucide-react';
import FarmerProductCard from '@/components/FarmerProductCard';
import RadiusControl from '@/components/RadiusControl';
import ScreenLayout from '@/components/layout/ScreenLayout';
import { useGeo } from '@/utils/geo';
import http from '@/api/http';
import { AdPreview } from '@/types';

interface FarmerCategory {
  _id: string;
  slug: string;
  name: string;
  icon3d?: string;
}

interface FarmerAd extends AdPreview {
  unitType?: string;
  quantity?: number;
  freshAt?: string;
  isSeasonal?: boolean;
  isFarmerAd?: boolean;
  pricePerKg?: number;
  categoryName?: string;
}

type SortOption = 'distance' | 'price_asc' | 'price_desc' | 'newest';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'distance', label: 'Ближайшие' },
  { value: 'price_asc', label: 'Дешевле' },
  { value: 'price_desc', label: 'Дороже' },
  { value: 'newest', label: 'Новые' },
];

export default function FarmerFeedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { coords, status: geoStatus, requestLocation, radiusKm, setRadius } = useGeo(false);

  const [categories, setCategories] = useState<FarmerCategory[]>([]);
  const [ads, setAds] = useState<FarmerAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('category') || null
  );
  const [sort, setSort] = useState<SortOption>('distance');
  const [showFilters, setShowFilters] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    http.get('/api/farmer/categories/active')
      .then(({ data }) => setCategories(data.data || []))
      .catch(console.error);
  }, []);

  const fetchAds = useCallback(async (offset = 0, append = false) => {
    if (!coords) return;

    if (offset === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const params: Record<string, any> = {
        lat: coords.lat,
        lng: coords.lng,
        radius: radiusKm,
        sort,
        limit: 20,
        offset,
      };

      if (selectedCategory) {
        params.categorySlug = selectedCategory;
      }

      const { data } = await http.get('/api/farmer/ads', { params });

      if (append) {
        setAds((prev) => [...prev, ...data.data.ads]);
      } else {
        setAds(data.data.ads);
      }
      setTotal(data.data.total);
      setHasMore(data.data.hasMore);
    } catch (error) {
      console.error('Failed to fetch farmer ads:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [coords, radiusKm, selectedCategory, sort]);

  useEffect(() => {
    if (coords) {
      fetchAds(0, false);
    }
  }, [coords, radiusKm, selectedCategory, sort, fetchAds]);

  const handleRequestLocation = async () => {
    setGeoLoading(true);
    try {
      await requestLocation();
    } finally {
      setGeoLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchAds(ads.length, true);
    }
  };

  const isGeoLoading = geoLoading || geoStatus === 'loading';
  const needsLocation = !coords && !geoLoading;

  const headerContent = (
    <div style={{
      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      padding: '20px 16px',
      color: '#fff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: 'rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Leaf size={28} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            Фермерский рынок
          </h1>
          <p style={{ fontSize: 14, margin: 0, opacity: 0.9 }}>
            Свежие продукты от местных фермеров
          </p>
        </div>
      </div>

      {coords && total > 0 && (
        <div style={{
          display: 'flex',
          gap: 16,
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: 12,
          padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={16} />
            <span style={{ fontSize: 14 }}>В радиусе {radiusKm} км</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={16} />
            <span style={{ fontSize: 14 }}>{total} товаров</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <ScreenLayout header={headerContent} showBottomNav={true}>
      <div style={{ background: '#F8FAFC' }}>
        {needsLocation && (
          <div style={{ padding: 16 }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: 20,
              padding: 28,
              textAlign: 'center',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
            }}>
              <div style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <MapPin size={36} color="#10B981" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: '#111827' }}>
                Найдите фермеров рядом
              </h3>
              <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 24px' }}>
                Укажите местоположение, чтобы увидеть свежие продукты
              </p>
              <button
                onClick={handleRequestLocation}
                disabled={isGeoLoading}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: isGeoLoading ? '#9CA3AF' : '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 17,
                  fontWeight: 600,
                  cursor: isGeoLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
                data-testid="button-request-location"
              >
                {isGeoLoading ? (
                  <>
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    Определяем...
                  </>
                ) : (
                  <>
                    <MapPin size={20} />
                    Определить местоположение
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {coords && (
          <div style={{ padding: '16px 16px 0' }}>
            <RadiusControl
              value={radiusKm}
              onChange={setRadius}
              disabled={false}
            />

            <div style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 12,
              marginTop: 16,
              scrollSnapType: 'x mandatory',
            }}>
              <button
                onClick={() => setSelectedCategory(null)}
                style={{
                  flexShrink: 0,
                  padding: '10px 16px',
                  background: !selectedCategory ? '#10B981' : '#FFFFFF',
                  color: !selectedCategory ? '#FFFFFF' : '#374151',
                  border: !selectedCategory ? 'none' : '1px solid #E5E7EB',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  scrollSnapAlign: 'start',
                }}
                data-testid="category-all"
              >
                Все
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => setSelectedCategory(cat.slug)}
                  style={{
                    flexShrink: 0,
                    padding: '10px 16px',
                    background: selectedCategory === cat.slug ? '#10B981' : '#FFFFFF',
                    color: selectedCategory === cat.slug ? '#FFFFFF' : '#374151',
                    border: selectedCategory === cat.slug ? 'none' : '1px solid #E5E7EB',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    scrollSnapAlign: 'start',
                  }}
                  data-testid={`category-${cat.slug}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSort(opt.value)}
                    style={{
                      padding: '8px 12px',
                      background: sort === opt.value ? '#EBF3FF' : 'transparent',
                      color: sort === opt.value ? '#3B73FC' : '#6B7280',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                    data-testid={`sort-${opt.value}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {coords && (
          <div style={{ padding: '0 16px 16px' }}>
            {loading && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Loader2 size={40} color="#10B981" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ fontSize: 16, color: '#6B7280', margin: 0 }}>Загружаем товары...</p>
              </div>
            )}

            {!loading && ads.length === 0 && (
              <div style={{
                background: '#FFFFFF',
                borderRadius: 20,
                padding: 32,
                textAlign: 'center',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🌾</div>
                <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px', color: '#111827' }}>
                  Пока нет товаров
                </h3>
                <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 20px' }}>
                  {selectedCategory 
                    ? 'В этой категории пока нет товаров рядом' 
                    : 'В вашем радиусе пока нет фермерских товаров'}
                </p>
                <button
                  onClick={() => setRadius(Math.min(radiusKm + 5, 100))}
                  style={{
                    padding: '12px 24px',
                    background: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  data-testid="button-increase-radius"
                >
                  Увеличить радиус
                </button>
              </div>
            )}

            {!loading && ads.length > 0 && (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 12,
                }}>
                  {ads.map((ad) => (
                    <FarmerProductCard key={ad._id} ad={ad} compact />
                  ))}
                </div>

                {hasMore && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    style={{
                      width: '100%',
                      padding: '14px',
                      marginTop: 20,
                      background: '#FFFFFF',
                      color: '#10B981',
                      border: '2px solid #10B981',
                      borderRadius: 14,
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: loadingMore ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                    data-testid="button-load-more"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                        Загружаем...
                      </>
                    ) : (
                      'Загрузить ещё'
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <button
          onClick={() => navigate('/farmer/bulk-upload')}
          style={{
            position: 'fixed',
            bottom: 100,
            right: 16,
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: '#FFFFFF',
            border: 'none',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          data-testid="button-add-products"
        >
          <Plus size={28} />
        </button>
      </div>
    </ScreenLayout>
  );
}
