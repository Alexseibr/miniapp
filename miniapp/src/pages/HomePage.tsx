import { useEffect, useState, useMemo } from 'react';
import { Loader2, MapPin, PlusCircle } from 'lucide-react';
import Header from '@/components/Header';
import GroupSelector from '@/components/GroupSelector';
import SubcategoryChips from '@/components/SubcategoryChips';
import RadiusControl from '@/components/RadiusControl';
import AdCard from '@/components/AdCard';
import EmptyState from '@/widgets/EmptyState';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { useGeo } from '@/utils/geo';
import { useNearbyAds } from '@/hooks/useNearbyAds';

export default function HomePage() {
  const { categories, loading: categoriesLoading, loadCategories } = useCategoriesStore();
  const { coords, status: geoStatus, requestLocation, radiusKm, setRadius } = useGeo(false);
  
  const [selectedGroupSlug, setSelectedGroupSlug] = useState<string | null>(null);
  const [selectedSubcategorySlug, setSelectedSubcategorySlug] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const selectedGroup = useMemo(() => {
    return categories.find((cat) => cat.slug === selectedGroupSlug) || null;
  }, [categories, selectedGroupSlug]);

  const { ads, loading: adsLoading, isEmpty, hasVeryFew } = useNearbyAds({
    coords,
    radiusKm,
    categoryId: selectedGroupSlug || undefined,
    subcategoryId: selectedSubcategorySlug || undefined,
    enabled: !!selectedGroupSlug && !!coords,
  });

  const handleIncreaseRadius = () => {
    const newRadius = Math.min(radiusKm + 5, 50);
    setRadius(newRadius);
  };

  const needsLocation = !coords && geoStatus !== 'loading';
  const showAds = !!selectedGroupSlug && !!coords;

  return (
    <div style={{ paddingBottom: '80px', background: '#F8FAFC', minHeight: '100vh' }}>
      <Header />

      {/* 1. GroupSelector */}
      <GroupSelector
        categories={categories}
        selectedGroupSlug={selectedGroupSlug}
        onSelect={(slug) => {
          setSelectedGroupSlug(slug);
          setSelectedSubcategorySlug(null);
        }}
        loading={categoriesLoading}
      />

      {/* 2. SubcategoryChips */}
      {selectedGroup && selectedGroup.subcategories && selectedGroup.subcategories.length > 0 && (
        <SubcategoryChips
          subcategories={selectedGroup.subcategories}
          selectedSlug={selectedSubcategorySlug}
          onSelect={setSelectedSubcategorySlug}
        />
      )}

      {/* 3. Геолокация CTA или RadiusControl */}
      <div style={{ padding: '16px' }}>
        {needsLocation && selectedGroupSlug && (
          <div style={{ 
            background: '#ffffff', 
            borderRadius: 16, 
            padding: 24, 
            textAlign: 'center',
            border: '1px solid #E5E7EB',
          }}>
            <MapPin size={48} color="#3B73FC" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px', color: '#111827' }}>
              Определите местоположение
            </h3>
            <p style={{ fontSize: 16, color: '#6B7280', margin: '0 0 20px' }}>
              Чтобы показать объявления рядом с вами
            </p>
            <button
              onClick={requestLocation}
              disabled={geoStatus === 'loading'}
              style={{
                width: '100%',
                padding: '16px',
                background: '#3B73FC',
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                fontSize: 18,
                fontWeight: 600,
                cursor: geoStatus === 'loading' ? 'not-allowed' : 'pointer',
                opacity: geoStatus === 'loading' ? 0.7 : 1,
                minHeight: 52,
              }}
              data-testid="button-request-location"
            >
              {geoStatus === 'loading' ? 'Получаем геолокацию...' : 'Определить местоположение'}
            </button>
          </div>
        )}

        {coords && selectedGroupSlug && (
          <RadiusControl
            value={radiusKm}
            onChange={setRadius}
            disabled={false}
          />
        )}
      </div>

      {/* 4. Список объявлений или пустые состояния */}
      {showAds && (
        <div style={{ padding: '0 16px 20px' }}>
          {adsLoading && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Loader2 size={40} color="#3B73FC" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ fontSize: 16, color: '#6B7280', margin: 0 }}>Загружаем объявления...</p>
            </div>
          )}

          {!adsLoading && isEmpty && (
            <div style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: 32,
              textAlign: 'center',
              border: '1px solid #E5E7EB',
            }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 12px', color: '#111827' }}>
                Объявлений не найдено
              </h3>
              <p style={{ fontSize: 16, color: '#6B7280', margin: '0 0 20px' }}>
                В радиусе {radiusKm} км нет объявлений в категории "{selectedGroup?.name}"
              </p>
              <button
                onClick={handleIncreaseRadius}
                style={{
                  padding: '14px 24px',
                  background: '#3B73FC',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  minHeight: 48,
                }}
                data-testid="button-increase-radius"
              >
                <PlusCircle size={20} />
                Увеличить радиус (+5 км)
              </button>
            </div>
          )}

          {!adsLoading && hasVeryFew && (
            <div style={{
              background: '#FEF3C7',
              border: '1px solid #FCD34D',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}>
              <p style={{ fontSize: 15, color: '#92400E', margin: 0 }}>
                Нашли мало объявлений ({ads.length}). Попробуйте увеличить радиус.
              </p>
            </div>
          )}

          {!adsLoading && ads.length > 0 && (
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 16px', color: '#111827' }}>
                Найдено объявлений: {ads.length}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {ads.map((ad) => (
                  <AdCard key={ad._id} ad={ad} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Пустое состояние - если группа не выбрана */}
      {!selectedGroupSlug && !categoriesLoading && (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 18, color: '#9CA3AF' }}>
            ☝️ Выберите категорию выше, чтобы начать поиск
          </p>
        </div>
      )}
    </div>
  );
}
