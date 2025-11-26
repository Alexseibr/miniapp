import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MapPin, Search, ChevronRight, Edit2, Package } from 'lucide-react';
import GeoOnboarding from '@/components/GeoOnboarding';
import LocationSettingsModal from '@/components/LocationSettingsModal';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { useGeo } from '@/utils/geo';
import { useNearbyAds } from '@/hooks/useNearbyAds';
import { CategoryNode, AdPreview } from '@/types';
import { CATEGORY_ICONS } from '@/constants/categoryIcons';
import OptimizedImage from '@/components/OptimizedImage';

const QUICK_CATEGORIES = [
  { slug: 'farmer-market', label: 'Фермерский рынок' },
  { slug: 'lichnye-veshchi', label: 'Личные вещи' },
  { slug: 'elektronika', label: 'Электроника б/у' },
  { slug: 'selhoztekhnika', label: 'Сельхоз техника' },
  { slug: 'uslugi', label: 'Услуги' },
  { slug: 'arenda', label: 'Аренда' },
];

const DEFAULT_RADIUS_KM = 3;

export default function HomePage() {
  const navigate = useNavigate();
  const { categories, loading: categoriesLoading, loadCategories } = useCategoriesStore();
  const { 
    coords, 
    cityName,
    radiusKm,
    setRadius,
    requestLocation,
    hasCompletedOnboarding,
  } = useGeo(false);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLocationSettings, setShowLocationSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!hasCompletedOnboarding && !coords) {
      setShowOnboarding(true);
    }
  }, [hasCompletedOnboarding, coords]);

  const { ads: popularAds, loading: adsLoading } = useNearbyAds({
    coords,
    radiusKm: DEFAULT_RADIUS_KM,
    enabled: !!coords,
    limit: 10,
  });

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/feed?q=${encodeURIComponent(searchQuery.trim())}&radiusKm=${DEFAULT_RADIUS_KM}`);
    }
  }, [searchQuery, navigate]);

  const handleCategoryClick = (slug: string) => {
    navigate(`/feed?categoryId=${encodeURIComponent(slug)}&radiusKm=${DEFAULT_RADIUS_KM}`);
  };

  const handleAdClick = (ad: AdPreview) => {
    navigate(`/ads/${ad._id}`);
  };

  const getCategoryIcon = (slug: string): string | null => {
    const category = categories.find(c => c.slug === slug);
    let iconSrc = category?.icon3d || CATEGORY_ICONS[slug] || null;
    if (iconSrc && iconSrc.startsWith('/attached_assets/')) {
      iconSrc = `${window.location.origin}${iconSrc}`;
    }
    return iconSrc;
  };

  const getCategoryCount = (slug: string): number => {
    return popularAds.filter(ad => 
      ad.categoryId === slug || ad.subcategoryId === slug
    ).length;
  };

  const locationName = cityName || (coords ? 'Ваше местоположение' : 'Не указано');

  if (showOnboarding) {
    return <GeoOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div style={{ 
      paddingBottom: 90, 
      background: '#F8FAFC', 
      minHeight: '100vh' 
    }}>
      {/* Блок 1: Локация */}
      <div style={{
        background: '#FFFFFF',
        padding: '12px 16px',
        borderBottom: '1px solid #E5E7EB',
      }}>
        <button
          onClick={() => setShowLocationSettings(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: coords ? '#EEF2FF' : '#FEF3C7',
            border: 'none',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 500,
            color: coords ? '#4338CA' : '#92400E',
            cursor: 'pointer',
          }}
          data-testid="button-location-chip"
        >
          <MapPin size={14} />
          <span>Вы в: {locationName}</span>
          <Edit2 size={12} style={{ opacity: 0.7 }} />
        </button>
      </div>

      {/* Блок 2: Поиск */}
      <div style={{
        background: '#FFFFFF',
        padding: '12px 16px 16px',
        borderBottom: '1px solid #E5E7EB',
      }}>
        <form onSubmit={handleSearch}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            background: '#F3F4F6',
            borderRadius: 16,
          }}>
            <Search size={20} color="#9CA3AF" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Что вы ищете рядом с вами?"
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontSize: 16,
                color: '#111827',
                outline: 'none',
              }}
              data-testid="input-search"
            />
          </div>
        </form>
      </div>

      <div style={{ padding: '20px 16px' }}>
        {/* Блок 3: Быстрые категории */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ 
            fontSize: 18, 
            fontWeight: 700, 
            margin: '0 0 14px', 
            color: '#111827' 
          }}>
            Быстрые категории
          </h2>

          {categoriesLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Loader2 size={28} color="#4F46E5" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
            }}>
              {QUICK_CATEGORIES.map((cat) => {
                const iconSrc = getCategoryIcon(cat.slug);
                const count = getCategoryCount(cat.slug);
                
                return (
                  <button
                    key={cat.slug}
                    onClick={() => handleCategoryClick(cat.slug)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '14px 8px',
                      background: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: 16,
                      cursor: 'pointer',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      position: 'relative',
                      minHeight: 100,
                    }}
                    data-testid={`category-quick-${cat.slug}`}
                  >
                    {/* Бейдж с количеством */}
                    {count > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        background: '#4F46E5',
                        color: '#FFFFFF',
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 10,
                      }}>
                        {count} рядом
                      </span>
                    )}
                    
                    <div style={{
                      width: 44,
                      height: 44,
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {iconSrc ? (
                        <OptimizedImage
                          src={iconSrc}
                          alt={cat.label}
                          style={{ width: 44, height: 44, objectFit: 'contain' }}
                        />
                      ) : (
                        <Package size={32} color="#6B7280" />
                      )}
                    </div>
                    
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#374151',
                      textAlign: 'center',
                      lineHeight: 1.3,
                    }}>
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Блок 4: Популярно рядом */}
        <section>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: 12 
          }}>
            <h2 style={{ 
              fontSize: 18, 
              fontWeight: 700, 
              margin: 0, 
              color: '#111827' 
            }}>
              Популярно рядом с вами
            </h2>
            {popularAds.length > 0 && (
              <button
                onClick={() => navigate('/feed')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 13,
                  color: '#4F46E5',
                  fontWeight: 500,
                }}
                data-testid="button-view-all"
              >
                Все
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          {!coords ? (
            <div style={{
              background: '#FFFFFF',
              borderRadius: 16,
              padding: 24,
              textAlign: 'center',
              border: '1px solid #E5E7EB',
            }}>
              <MapPin size={36} color="#4F46E5" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 16px' }}>
                Укажите местоположение, чтобы увидеть товары рядом
              </p>
              <button
                onClick={() => setShowLocationSettings(true)}
                style={{
                  padding: '12px 24px',
                  background: '#4F46E5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                data-testid="button-set-location"
              >
                Указать местоположение
              </button>
            </div>
          ) : adsLoading ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <Loader2 size={28} color="#4F46E5" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : popularAds.length === 0 ? (
            <div style={{
              background: '#FFFFFF',
              borderRadius: 16,
              padding: 20,
              textAlign: 'center',
              border: '1px solid #E5E7EB',
            }}>
              <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
                Пока нет объявлений рядом. Станьте первым!
              </p>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              overflowX: 'auto',
              gap: 12,
              paddingBottom: 8,
              marginLeft: -16,
              marginRight: -16,
              paddingLeft: 16,
              paddingRight: 16,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}>
              {popularAds.slice(0, 8).map((ad) => (
                <div 
                  key={ad._id} 
                  style={{ 
                    flexShrink: 0, 
                    width: 140,
                  }}
                >
                  <PopularAdCard ad={ad} onClick={() => handleAdClick(ad)} />
                </div>
              ))}
            </div>
          )}
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

function PopularAdCard({ ad, onClick }: { ad: AdPreview; onClick: () => void }) {
  const formatPrice = (price: number, currency?: string) => {
    if (currency === 'USD') return `$${price}`;
    if (currency === 'EUR') return `€${price}`;
    return `${price.toLocaleString('ru-RU')} ₽`;
  };

  const formatDistance = (km?: number) => {
    if (!km) return '';
    if (km < 1) return `${Math.round(km * 1000)} м`;
    return `${km.toFixed(1)} км`;
  };

  const photoUrl = ad.photos?.[0] 
    ? `/api/media/proxy?url=${encodeURIComponent(ad.photos[0])}&w=280&h=280`
    : null;

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
        overflow: 'hidden',
      }}
      data-testid={`ad-popular-${ad._id}`}
    >
      <div style={{
        width: '100%',
        height: 100,
        background: '#F3F4F6',
        overflow: 'hidden',
      }}>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={ad.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            loading="lazy"
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9CA3AF',
          }}>
            <Package size={24} />
          </div>
        )}
      </div>
      
      <div style={{ padding: '8px 10px' }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#111827',
          marginBottom: 4,
        }}>
          {formatPrice(ad.price, ad.currency)}
        </div>
        
        {ad.distanceKm !== undefined && (
          <div style={{
            fontSize: 11,
            color: '#6B7280',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <MapPin size={10} />
            {formatDistance(ad.distanceKm)}
          </div>
        )}
      </div>
    </button>
  );
}
