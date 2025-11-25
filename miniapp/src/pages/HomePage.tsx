import { useEffect, useState, useMemo } from 'react';
import { Loader2, MapPin, PlusCircle } from 'lucide-react';
import Header from '@/components/Header';
import GroupSelector from '@/components/GroupSelector';
import SubcategoryChips from '@/components/SubcategoryChips';
import RadiusControl from '@/components/RadiusControl';
import AdCard from '@/components/AdCard';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { useGeo } from '@/utils/geo';
import { useNearbyAds } from '@/hooks/useNearbyAds';

export default function HomePage() {
  const { categories, loading: categoriesLoading, loadCategories } = useCategoriesStore();
  const { coords, status: geoStatus, requestLocation, radiusKm, setRadius } = useGeo(false);
  
  const [selectedGroupSlug, setSelectedGroupSlug] = useState<string | null>(null);
  const [selectedSubcategorySlug, setSelectedSubcategorySlug] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

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
    const newRadius = Math.min(radiusKm + 5, 100);
    setRadius(newRadius);
  };

  const handleRequestLocation = async () => {
    setGeoLoading(true);
    try {
      await requestLocation();
    } finally {
      setGeoLoading(false);
    }
  };

  const isGeoLoading = geoLoading || geoStatus === 'loading';
  const needsLocation = !coords && geoStatus !== 'loading' && !geoLoading;
  const showAds = !!selectedGroupSlug && !!coords;

  return (
    <div style={{ paddingBottom: '80px', background: '#F8FAFC', minHeight: '100vh' }}>
      <Header />

      {/* Categories */}
      <GroupSelector
        categories={categories}
        selectedGroupSlug={selectedGroupSlug}
        onSelect={(slug) => {
          setSelectedGroupSlug(slug);
          setSelectedSubcategorySlug(null);
        }}
        loading={categoriesLoading}
      />

      {/* Subcategory Chips */}
      {selectedGroup && selectedGroup.subcategories && selectedGroup.subcategories.length > 0 && (
        <SubcategoryChips
          subcategories={selectedGroup.subcategories}
          selectedSlug={selectedSubcategorySlug}
          onSelect={setSelectedSubcategorySlug}
        />
      )}

      {/* Location CTA or Radius Control */}
      <div style={{ padding: '16px' }}>
        {needsLocation && selectedGroupSlug && (
          <div style={{ 
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)', 
            borderRadius: 20, 
            padding: 28, 
            textAlign: 'center',
            border: '1px solid #E5E7EB',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
          }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #EBF3FF 0%, #DBEAFE 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <MapPin size={36} color="#3B73FC" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: '#111827' }}>
              Определите местоположение
            </h3>
            <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 24px', lineHeight: 1.5 }}>
              Чтобы показать объявления рядом с вами
            </p>
            <button
              onClick={handleRequestLocation}
              disabled={isGeoLoading}
              style={{
                width: '100%',
                padding: '16px',
                background: isGeoLoading ? '#9CA3AF' : '#3B73FC',
                color: '#ffffff',
                border: 'none',
                borderRadius: 14,
                fontSize: 17,
                fontWeight: 600,
                cursor: isGeoLoading ? 'not-allowed' : 'pointer',
                minHeight: 54,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'background 0.2s',
              }}
              data-testid="button-request-location"
            >
              {isGeoLoading ? (
                <>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  Получаем геолокацию...
                </>
              ) : (
                <>
                  <MapPin size={20} />
                  Определить местоположение
                </>
              )}
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

      {/* Ads List */}
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
              borderRadius: 20,
              padding: 32,
              textAlign: 'center',
              border: '1px solid #E5E7EB',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
            }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 12px', color: '#111827' }}>
                Объявлений не найдено
              </h3>
              <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 24px', lineHeight: 1.5 }}>
                В радиусе {radiusKm} км нет объявлений в категории "{selectedGroup?.name}"
              </p>
              <button
                onClick={handleIncreaseRadius}
                style={{
                  padding: '14px 28px',
                  background: '#3B73FC',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  minHeight: 50,
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
              borderRadius: 14,
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
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: '#111827' }}>
                Найдено: {ads.length} {ads.length === 1 ? 'объявление' : ads.length < 5 ? 'объявления' : 'объявлений'}
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

      {/* Empty state - no group selected */}
      {!selectedGroupSlug && !categoriesLoading && (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 17, color: '#9CA3AF', lineHeight: 1.5 }}>
            Выберите категорию выше, чтобы начать поиск
          </p>
        </div>
      )}
    </div>
  );
}
