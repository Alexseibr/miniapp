import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MapPin, Home, SlidersHorizontal } from 'lucide-react';
import AdCard from '@/components/AdCard';
import RadiusControl from '@/components/RadiusControl';
import EmptyState from '@/widgets/EmptyState';
import { useGeo } from '@/utils/geo';
import { useNearbyAds } from '@/hooks/useNearbyAds';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { CategoryNode } from '@/types';

export default function FeedPage() {
  const navigate = useNavigate();
  const { coords, status: geoStatus, requestLocation, radiusKm, setRadius } = useGeo();
  const { categories, loading: categoriesLoading, loadCategories } = useCategoriesStore();
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const { ads, loading: adsLoading, isEmpty } = useNearbyAds({
    coords,
    radiusKm,
    categoryId: selectedCategoryId || undefined,
    enabled: !!coords,
  });

  const needsLocation = !coords && geoStatus !== 'loading';

  const handleSelectCategory = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setShowCategoryFilter(false);
  };

  const handleClearFilters = () => {
    setSelectedCategoryId(null);
  };

  return (
    <div style={{ paddingBottom: '80px', background: '#F8FAFC', minHeight: '100vh' }}>
      {/* Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: '#ffffff',
          zIndex: 10,
          borderBottom: '1px solid #E5E7EB',
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              background: '#3B73FC',
              color: '#ffffff',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: 44,
            }}
            data-testid="button-home"
          >
            <Home size={20} />
            <span>Главная</span>
          </button>
          <h1 style={{ flex: 1, margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>
            Рядом со мной
          </h1>
        </div>
      </div>

      {/* Geo Request or Radius Control */}
      {needsLocation ? (
        <div style={{ padding: 20 }}>
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: 32,
              textAlign: 'center',
              border: '1px solid #E5E7EB',
            }}
          >
            <MapPin size={56} color="#3B73FC" style={{ margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 12px', color: '#111827' }}>
              Определите ваше местоположение
            </h2>
            <p style={{ fontSize: 18, color: '#6B7280', margin: '0 0 24px', lineHeight: 1.5 }}>
              Чтобы показать объявления рядом с вами, нужно определить ваше местоположение
            </p>
            <button
              onClick={requestLocation}
              disabled={geoStatus === 'loading'}
              style={{
                width: '100%',
                padding: '18px',
                background: '#3B73FC',
                color: '#ffffff',
                border: 'none',
                borderRadius: 14,
                fontSize: 20,
                fontWeight: 600,
                cursor: geoStatus === 'loading' ? 'not-allowed' : 'pointer',
                opacity: geoStatus === 'loading' ? 0.7 : 1,
                minHeight: 56,
              }}
              data-testid="button-request-location"
            >
              {geoStatus === 'loading' ? 'Получаем геолокацию...' : 'Определить местоположение'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* RadiusControl */}
          <div style={{ padding: '20px 16px' }}>
            <RadiusControl value={radiusKm} onChange={setRadius} disabled={false} />
          </div>

          {/* Filter Button */}
          <div style={{ padding: '0 16px 16px' }}>
            <button
              onClick={() => setShowCategoryFilter(!showCategoryFilter)}
              disabled={categoriesLoading}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: showCategoryFilter ? '#EBF3FF' : '#FFFFFF',
                border: showCategoryFilter ? '2px solid #3B73FC' : '1px solid #E5E7EB',
                borderRadius: 12,
                fontSize: 17,
                fontWeight: 600,
                color: showCategoryFilter ? '#3B73FC' : '#374151',
                cursor: categoriesLoading ? 'not-allowed' : 'pointer',
                opacity: categoriesLoading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                minHeight: 48,
              }}
              data-testid="button-toggle-filters"
            >
              {categoriesLoading ? (
                <>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Загрузка...</span>
                </>
              ) : (
                <>
                  <SlidersHorizontal size={20} />
                  <span>
                    {selectedCategoryId
                      ? categories.find(c => c.slug === selectedCategoryId)?.name || 'Категория'
                      : 'Все категории'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Category Filter Panel */}
          {showCategoryFilter && (
            <div style={{ padding: '0 16px 20px' }}>
              <div style={{
                background: '#ffffff',
                borderRadius: 16,
                padding: 20,
                border: '1px solid #E5E7EB',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>
                    Выберите категорию
                  </h3>
                  {selectedCategoryId && (
                    <button
                      onClick={handleClearFilters}
                      style={{
                        padding: '8px 16px',
                        background: 'transparent',
                        border: '1px solid #E5E7EB',
                        borderRadius: 8,
                        fontSize: 14,
                        color: '#6B7280',
                        cursor: 'pointer',
                      }}
                      data-testid="button-clear-filters"
                    >
                      Сбросить
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    onClick={() => handleSelectCategory(null)}
                    style={{
                      padding: '12px 16px',
                      background: !selectedCategoryId ? '#EBF3FF' : '#F9FAFB',
                      border: !selectedCategoryId ? '2px solid #3B73FC' : '1px solid #E5E7EB',
                      borderRadius: 12,
                      fontSize: 16,
                      fontWeight: !selectedCategoryId ? 600 : 500,
                      color: !selectedCategoryId ? '#3B73FC' : '#374151',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      minHeight: 48,
                    }}
                    data-testid="filter-category-all"
                  >
                    <span style={{ flex: 1 }}>Все категории</span>
                    {!selectedCategoryId && <span style={{ fontSize: 20 }}>✓</span>}
                  </button>
                  
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.slug;
                    
                    return (
                      <button
                        key={cat.slug}
                        onClick={() => handleSelectCategory(cat.slug)}
                        style={{
                          padding: '12px 16px',
                          background: isSelected ? '#EBF3FF' : '#F9FAFB',
                          border: isSelected ? '2px solid #3B73FC' : '1px solid #E5E7EB',
                          borderRadius: 12,
                          fontSize: 16,
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? '#3B73FC' : '#374151',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          minHeight: 48,
                        }}
                        data-testid={`filter-category-${cat.slug}`}
                      >
                        {cat.icon3d && (
                          <img
                            src={cat.icon3d}
                            alt={cat.name}
                            style={{ width: 32, height: 32, objectFit: 'contain' }}
                          />
                        )}
                        <span style={{ flex: 1 }}>{cat.name}</span>
                        {isSelected && <span style={{ fontSize: 20 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Ads List */}
          <div style={{ padding: '0 16px 20px' }}>
            {adsLoading && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <Loader2 size={48} color="#3B73FC" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
                <p style={{ fontSize: 18, color: '#6B7280', margin: 0 }}>Загружаем объявления...</p>
              </div>
            )}

            {!adsLoading && isEmpty && (
              <div style={{
                background: '#ffffff',
                borderRadius: 16,
                padding: 40,
                textAlign: 'center',
                border: '1px solid #E5E7EB',
              }}>
                <h3 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 12px', color: '#111827' }}>
                  Объявлений не найдено
                </h3>
                <p style={{ fontSize: 17, color: '#6B7280', margin: 0 }}>
                  В радиусе {radiusKm} км нет объявлений
                </p>
              </div>
            )}

            {!adsLoading && ads.length > 0 && (
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 16px', color: '#111827' }}>
                  Найдено: {ads.length} {ads.length === 1 ? 'объявление' : 'объявлений'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {ads.map((ad) => (
                    <AdCard key={ad._id} ad={ad} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
