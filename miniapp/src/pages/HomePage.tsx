import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MapPin, Search, ChevronRight, Bell, Heart, Map } from 'lucide-react';
import GeoOnboarding from '@/components/GeoOnboarding';
import LocationSettingsModal from '@/components/LocationSettingsModal';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { useGeo } from '@/utils/geo';
import { useNearbyAds } from '@/hooks/useNearbyAds';
import { AdPreview } from '@/types';
import FavoriteButton from '@/components/FavoriteButton';

const QUICK_CATEGORIES = [
  { slug: 'farmer-market', label: 'Фермерский рынок', emoji: '🥬', bgColor: '#E8F5E9' },
  { slug: 'ovoschi-frukty', label: 'Овощи/фрукты', emoji: '🍎', bgColor: '#FFEBEE' },
  { slug: 'vypechka', label: 'Выпечка свежая', emoji: '🥖', bgColor: '#FFF8E1' },
  { slug: 'lichnye-veshchi', label: 'Личные вещи', emoji: '👔', bgColor: '#E3F2FD' },
  { slug: 'odezhda', label: 'Одежда', emoji: '👗', bgColor: '#FCE4EC' },
  { slug: 'obuv', label: 'Обувь', emoji: '👟', bgColor: '#E0F7FA' },
  { slug: 'bytovye-melochi', label: 'Бытовые мелочи', emoji: '🏠', bgColor: '#FFF3E0' },
  { slug: 'elektronika', label: 'Телефоны & Электроника', emoji: '📱', bgColor: '#ECEFF1' },
  { slug: 'selhoztekhnika', label: 'Сельхоз техника', emoji: '🚜', bgColor: '#FFF8E1' },
  { slug: 'uslugi', label: 'Услуги', emoji: '🔧', bgColor: '#ECEFF1' },
  { slug: 'arenda', label: 'Аренда инструмента', emoji: '🛠️', bgColor: '#ECEFF1' },
  { slug: 'darom', label: 'Даром отдаю', emoji: '🎁', bgColor: '#FCE4EC', isHot: true },
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

  const { ads: nearbyAds, loading: adsLoading } = useNearbyAds({
    coords,
    radiusKm: radiusKm || DEFAULT_RADIUS_KM,
    enabled: !!coords,
    limit: 10,
  });

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleSearchClick = () => {
    navigate('/search');
  };

  const handleCategoryClick = (slug: string) => {
    navigate(`/category/${encodeURIComponent(slug)}`);
  };

  const handleAdClick = (ad: AdPreview) => {
    navigate(`/ads/${ad._id}`);
  };

  const handleMapClick = () => {
    navigate('/geo-feed');
  };

  if (showOnboarding) {
    return <GeoOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div style={{ 
      paddingBottom: 100, 
      background: '#FFFFFF', 
      minHeight: '100vh',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          color: '#3A7BFF',
          margin: 0,
          letterSpacing: '-0.5px',
        }}>
          KETMAR
        </h1>
        
        <button
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#F5F6F8',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
          }}
          data-testid="button-notifications"
        >
          <Bell size={20} color="#6B7280" />
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 8,
            height: 8,
            background: '#EF4444',
            borderRadius: '50%',
            border: '2px solid #FFFFFF',
          }} />
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ padding: '0 16px 20px' }}>
        <button
          onClick={handleSearchClick}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            background: '#F5F6F8',
            border: 'none',
            borderRadius: 16,
            cursor: 'pointer',
            textAlign: 'left',
          }}
          data-testid="button-search"
        >
          <Search size={20} color="#9CA3AF" />
          <span style={{ 
            fontSize: 16, 
            color: '#9CA3AF',
          }}>
            Найти товары, продукты, услуги...
          </span>
        </button>
      </div>

      {/* Quick Categories */}
      <section style={{ padding: '0 16px 24px' }}>
        <h2 style={{ 
          fontSize: 18, 
          fontWeight: 700, 
          margin: '0 0 16px', 
          color: '#1F2937',
        }}>
          Быстрые категории
        </h2>

        {categoriesLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Loader2 
              size={28} 
              style={{ 
                color: '#3A7BFF',
                animation: 'spin 1s linear infinite',
              }} 
            />
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
          }}>
            {QUICK_CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => handleCategoryClick(cat.slug)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '16px 8px 14px',
                  background: '#FFFFFF',
                  border: 'none',
                  borderRadius: 16,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  transition: 'transform 0.2s ease',
                  position: 'relative',
                }}
                data-testid={`category-quick-${cat.slug}`}
              >
                {cat.isHot && (
                  <span style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    background: '#EF4444',
                    color: '#FFFFFF',
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 6,
                    textTransform: 'uppercase',
                  }}>
                    HOT
                  </span>
                )}
                
                <div style={{
                  width: 56,
                  height: 56,
                  background: cat.bgColor,
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                  fontSize: 28,
                }}>
                  {cat.emoji}
                </div>
                
                <span style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#1F2937',
                  textAlign: 'center',
                  lineHeight: 1.3,
                }}>
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Nearby Section */}
      <section style={{ padding: '0 16px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 4,
        }}>
          <div>
            <h2 style={{ 
              fontSize: 18, 
              fontWeight: 700, 
              margin: 0, 
              color: '#1F2937',
            }}>
              Рядом с вами
            </h2>
            <p style={{
              fontSize: 13,
              color: '#9CA3AF',
              margin: '4px 0 0',
            }}>
              В радиусе {radiusKm || DEFAULT_RADIUS_KM} км
            </p>
          </div>
          
          <button
            onClick={handleMapClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: '#F5F6F8',
              border: 'none',
              borderRadius: 20,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              color: '#1F2937',
            }}
            data-testid="button-map"
          >
            <Map size={16} color="#3A7BFF" />
            Карта
          </button>
        </div>

        {!coords ? (
          <div style={{
            background: '#F8F9FB',
            borderRadius: 16,
            padding: 28,
            textAlign: 'center',
            marginTop: 16,
          }}>
            <MapPin size={32} color="#9CA3AF" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 16px' }}>
              Укажите местоположение, чтобы увидеть товары рядом
            </p>
            <button
              onClick={() => setShowLocationSettings(true)}
              style={{
                padding: '12px 24px',
                background: '#3A7BFF',
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
            <Loader2 
              size={28} 
              style={{ 
                color: '#3A7BFF',
                animation: 'spin 1s linear infinite',
              }} 
            />
          </div>
        ) : nearbyAds.length === 0 ? (
          <div style={{
            background: '#F8F9FB',
            borderRadius: 16,
            padding: 24,
            textAlign: 'center',
            marginTop: 16,
          }}>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
              Пока нет объявлений рядом. Станьте первым!
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
            marginTop: 16,
          }}>
            {nearbyAds.slice(0, 6).map((ad) => (
              <NearbyAdCard 
                key={ad._id} 
                ad={ad} 
                onClick={() => handleAdClick(ad)} 
              />
            ))}
          </div>
        )}
      </section>

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

function NearbyAdCard({ ad, onClick }: { ad: AdPreview; onClick: () => void }) {
  const formatPrice = (price: number, currency?: string) => {
    if (price === 0) return 'Даром';
    return `₽${price.toLocaleString('ru-RU')}`;
  };

  const formatDistance = (km?: number) => {
    if (!km) return '';
    if (km < 1) return `${Math.round(km * 1000)} м`;
    return `${km.toFixed(1)} км`;
  };

  const photoUrl = ad.photos?.[0] 
    ? `/api/media/proxy?url=${encodeURIComponent(ad.photos[0])}&w=400&h=400`
    : null;

  const isFresh = ad.createdAt && 
    (Date.now() - new Date(ad.createdAt).getTime()) < 48 * 60 * 60 * 1000;
  
  const isFree = ad.price === 0;

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        background: '#FFFFFF',
        border: 'none',
        borderRadius: 16,
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      }}
      data-testid={`ad-nearby-${ad._id}`}
    >
      <div style={{
        width: '100%',
        aspectRatio: '1',
        background: '#F5F6F8',
        overflow: 'hidden',
        position: 'relative',
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
            fontSize: 32,
          }}>
            📦
          </div>
        )}
        
        {/* Fresh badge */}
        {isFresh && (
          <div style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: '#22C55E',
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 8,
          }}>
            Свежее
          </div>
        )}

        {/* Free badge */}
        {isFree && (
          <div style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: '#EC4899',
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 8,
          }}>
            Даром
          </div>
        )}
        
        {/* Favorite button */}
        <div 
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            width: 32,
            height: 32,
            background: '#FFFFFF',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}>
            <Heart size={18} color="#9CA3AF" />
          </div>
        </div>
      </div>
      
      <div style={{ padding: '12px' }}>
        <div style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#1F2937',
          marginBottom: 4,
        }}>
          {formatPrice(ad.price, ad.currency)}
        </div>
        
        <div style={{
          fontSize: 13,
          color: '#6B7280',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: 6,
        }}>
          {ad.title}
        </div>

        {ad.distanceKm !== undefined && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            color: '#9CA3AF',
          }}>
            <MapPin size={12} />
            {formatDistance(ad.distanceKm)}
          </div>
        )}
      </div>
    </button>
  );
}
