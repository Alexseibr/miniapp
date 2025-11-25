import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MapPin, ChevronRight, RefreshCw } from 'lucide-react';
import { LogoFull } from '@/components/Logo';
import GeoOnboarding from '@/components/GeoOnboarding';
import LocationSettingsModal from '@/components/LocationSettingsModal';
import GlobalSearchBar from '@/components/GlobalSearchBar';
import AdCardSmall from '@/components/AdCardSmall';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { useGeo, formatRadiusLabel } from '@/utils/geo';
import { useNearbyAds } from '@/hooks/useNearbyAds';
import { CategoryNode, AdPreview } from '@/types';
import { CATEGORY_ICONS } from '@/constants/categoryIcons';
import OptimizedImage from '@/components/OptimizedImage';

const POPULAR_CATEGORY_SLUGS = [
  'farmer-market',
  'realty',
  'auto',
  'services',
  'construction',
  'electronics',
];

export default function HomePage() {
  const navigate = useNavigate();
  const { categories, loading: categoriesLoading, loadCategories } = useCategoriesStore();
  const { 
    coords, 
    status: geoStatus, 
    requestLocation, 
    radiusKm, 
    setRadius,
    cityName,
    hasCompletedOnboarding,
    completeOnboarding,
  } = useGeo(false);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLocationSettings, setShowLocationSettings] = useState(false);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!hasCompletedOnboarding && !coords) {
      setShowOnboarding(true);
    }
  }, [hasCompletedOnboarding, coords]);

  const { ads, loading: adsLoading } = useNearbyAds({
    coords,
    radiusKm,
    enabled: !!coords,
    limit: 6,
  });

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleCategoryClick = (category: CategoryNode) => {
    if (category.isLeaf) {
      navigate(`/feed?categoryId=${encodeURIComponent(category.slug)}`);
    } else if (category.subcategories && category.subcategories.length > 0) {
      navigate(`/category/${encodeURIComponent(category.slug)}`);
    } else {
      navigate(`/feed?categoryId=${encodeURIComponent(category.slug)}`);
    }
  };

  const handleAdClick = (ad: AdPreview) => {
    navigate(`/ads/${ad._id}`);
  };

  const popularCategories = categories.filter((cat) =>
    POPULAR_CATEGORY_SLUGS.includes(cat.slug)
  ).slice(0, 6);

  const getCategoryIcon = (category: CategoryNode) => {
    let iconSrc = category.icon3d || CATEGORY_ICONS[category.slug] || null;
    if (iconSrc && iconSrc.startsWith('/attached_assets/')) {
      iconSrc = `${window.location.origin}${iconSrc}`;
    }
    return iconSrc;
  };

  const locationLabel = cityName 
    ? `${cityName} • ${formatRadiusLabel(radiusKm)}`
    : coords 
      ? `Рядом с вами • ${formatRadiusLabel(radiusKm)}`
      : 'Местоположение не задано';

  if (showOnboarding) {
    return <GeoOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div style={{ paddingBottom: 90, background: '#F8FAFC', minHeight: '100vh' }}>
      <header
        style={{
          background: '#FFFFFF',
          padding: '12px 16px 16px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <LogoFull width={120} />
        </div>

        <button
          onClick={() => setShowLocationSettings(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            background: coords ? '#EBF3FF' : '#FEF3C7',
            border: coords ? '1px solid #BFDBFE' : '1px solid #FCD34D',
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 500,
            color: coords ? '#1D4ED8' : '#92400E',
            cursor: 'pointer',
            marginBottom: 12,
            transition: 'all 0.2s',
          }}
          data-testid="button-location-settings"
        >
          <MapPin size={16} />
          <span>{locationLabel}</span>
          <ChevronRight size={16} style={{ marginLeft: 'auto' }} />
        </button>

        <GlobalSearchBar 
          placeholder="Что вы ищете?" 
          compact 
        />
      </header>

      <div style={{ padding: '20px 16px' }}>
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#111827' }}>
                Популярное рядом
              </h2>
              <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>
                Свежие объявления около вас
              </p>
            </div>
            {coords && (
              <button
                onClick={() => requestLocation()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 8,
                  cursor: 'pointer',
                  opacity: geoStatus === 'loading' ? 0.5 : 1,
                }}
                disabled={geoStatus === 'loading'}
                data-testid="button-refresh-location"
              >
                <RefreshCw 
                  size={18} 
                  color="#6B7280" 
                  style={{ 
                    animation: geoStatus === 'loading' ? 'spin 1s linear infinite' : 'none' 
                  }} 
                />
              </button>
            )}
          </div>

          {!coords ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 16,
                padding: 24,
                textAlign: 'center',
                border: '1px solid #E5E7EB',
              }}
            >
              <MapPin size={40} color="#3B73FC" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 16px' }}>
                Укажите местоположение, чтобы увидеть объявления рядом
              </p>
              <button
                onClick={() => setShowLocationSettings(true)}
                style={{
                  padding: '12px 24px',
                  background: '#3B73FC',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                data-testid="button-set-location-cta"
              >
                Указать местоположение
              </button>
            </div>
          ) : adsLoading ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <Loader2 size={32} color="#3B73FC" style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: 14, color: '#6B7280', marginTop: 12 }}>Загружаем объявления...</p>
            </div>
          ) : ads.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 16,
                padding: 24,
                textAlign: 'center',
                border: '1px solid #E5E7EB',
              }}
            >
              <p style={{ fontSize: 15, color: '#6B7280', margin: 0 }}>
                Пока нет объявлений рядом. Попробуйте увеличить радиус или выбрать категорию.
              </p>
              <button
                onClick={() => setShowLocationSettings(true)}
                style={{
                  marginTop: 16,
                  padding: '10px 20px',
                  background: '#F3F4F6',
                  color: '#374151',
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                data-testid="button-change-radius"
              >
                Изменить радиус поиска
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
              }}
            >
              {ads.slice(0, 6).map((ad) => (
                <AdCardSmall key={ad._id} ad={ad} onSelect={() => handleAdClick(ad)} />
              ))}
            </div>
          )}

          {ads.length > 0 && (
            <button
              onClick={() => navigate('/feed')}
              style={{
                width: '100%',
                marginTop: 16,
                padding: '14px',
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                color: '#3B73FC',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              data-testid="button-view-all-ads"
            >
              Смотреть все объявления
              <ChevronRight size={18} />
            </button>
          )}
        </section>

        <section style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 14px', color: '#111827' }}>
            Популярные категории
          </h2>

          {categoriesLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Loader2 size={28} color="#3B73FC" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
              }}
            >
              {popularCategories.map((category) => {
                const iconSrc = getCategoryIcon(category);
                return (
                  <button
                    key={category.slug}
                    onClick={() => handleCategoryClick(category)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 12,
                      background: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: 14,
                      cursor: 'pointer',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      aspectRatio: '1',
                    }}
                    data-testid={`category-popular-${category.slug}`}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        marginBottom: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {iconSrc ? (
                        <OptimizedImage
                          src={iconSrc}
                          alt={category.name}
                          style={{ width: 48, height: 48, objectFit: 'contain' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            background: '#F3F4F6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span style={{ fontSize: 24 }}>📦</span>
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: '#374151',
                        textAlign: 'center',
                        lineHeight: 1.2,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {category.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={() => navigate('/all-categories')}
            style={{
              width: '100%',
              marginTop: 14,
              padding: '16px',
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 600,
              color: '#111827',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            data-testid="button-all-categories"
          >
            Все категории
            <ChevronRight size={20} color="#6B7280" />
          </button>
        </section>
      </div>

      {showLocationSettings && (
        <LocationSettingsModal
          isOpen={showLocationSettings}
          onClose={() => setShowLocationSettings(false)}
          currentCoords={coords}
          currentRadius={radiusKm}
          currentCity={cityName}
          onRadiusChange={setRadius}
          onLocationChange={requestLocation}
        />
      )}
    </div>
  );
}
