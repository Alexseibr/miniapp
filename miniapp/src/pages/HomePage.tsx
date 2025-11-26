import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MapPin, Search, ChevronRight, Edit2, Package, Sparkles } from 'lucide-react';
import GeoOnboarding from '@/components/GeoOnboarding';
import LocationSettingsModal from '@/components/LocationSettingsModal';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { useGeo } from '@/utils/geo';
import { useNearbyAds } from '@/hooks/useNearbyAds';
import { CategoryNode, AdPreview } from '@/types';
import { CATEGORY_ICONS } from '@/constants/categoryIcons';
import OptimizedImage from '@/components/OptimizedImage';
import logoSvg from '@/assets/ketmar_logo_rgb.svg';

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
  const [searchFocused, setSearchFocused] = useState(false);

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
      background: '#000000', 
      minHeight: '100vh',
      position: 'relative',
    }}>
      {/* Background gradients */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.08), transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(124, 58, 237, 0.06), transparent 50%)
        `,
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Hero Header */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        background: 'rgba(10, 15, 26, 0.8)',
        backdropFilter: 'blur(20px)',
        padding: '20px 16px',
        borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
      }}>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.5), transparent)',
        }} />

        {/* Logo & Location */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <img 
            src={logoSvg} 
            alt="KETMAR" 
            style={{ 
              height: 28,
              filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))',
            }} 
          />
          
          <button
            onClick={() => setShowLocationSettings(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              color: '#3B82F6',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
            }}
            data-testid="button-location-chip"
          >
            <MapPin size={12} />
            <span>{locationName}</span>
            <Edit2 size={10} style={{ opacity: 0.7 }} />
          </button>
        </div>

        {/* Search Input with Glow */}
        <form onSubmit={handleSearch}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            padding: '14px 16px',
            background: 'rgba(10, 15, 26, 0.8)',
            border: searchFocused 
              ? '1px solid #3B82F6' 
              : '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 16,
            boxShadow: searchFocused 
              ? '0 0 20px rgba(59, 130, 246, 0.3)' 
              : 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(10px)',
          }}>
            <Search 
              size={20} 
              style={{ 
                color: searchFocused ? '#3B82F6' : '#64748B',
                marginRight: 12,
                transition: 'color 0.3s',
              }} 
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Что вы ищете рядом с вами?"
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontSize: 16,
                color: '#F8FAFC',
                outline: 'none',
              }}
              data-testid="input-search"
            />
          </div>
        </form>
      </div>

      {/* Main Content */}
      <div style={{ padding: '20px 16px', position: 'relative', zIndex: 1 }}>
        {/* Quick Categories Section */}
        <section style={{ marginBottom: 28 }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
          }}>
            <div style={{
              width: 4,
              height: 20,
              background: 'linear-gradient(135deg, #3B82F6, #7C3AED)',
              borderRadius: 4,
              boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)',
            }} />
            <h2 style={{ 
              fontSize: 18, 
              fontWeight: 700, 
              margin: 0, 
              color: '#F8FAFC',
            }}>
              Быстрые категории
            </h2>
          </div>

          {categoriesLoading ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Loader2 
                size={28} 
                style={{ 
                  color: '#3B82F6',
                  animation: 'spin 1s linear infinite',
                  filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))',
                }} 
              />
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
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
                      padding: '16px 8px',
                      background: 'rgba(10, 15, 26, 0.6)',
                      border: '1px solid rgba(59, 130, 246, 0.15)',
                      borderRadius: 16,
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      minHeight: 110,
                      backdropFilter: 'blur(10px)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.3)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.15)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    data-testid={`category-quick-${cat.slug}`}
                  >
                    {count > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'linear-gradient(135deg, #3B82F6, #7C3AED)',
                        color: '#FFFFFF',
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 12,
                        boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {count}
                      </span>
                    )}
                    
                    <div style={{
                      width: 48,
                      height: 48,
                      marginBottom: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.3))',
                    }}>
                      {iconSrc ? (
                        <OptimizedImage
                          src={iconSrc}
                          alt={cat.label}
                          style={{ width: 48, height: 48, objectFit: 'contain' }}
                        />
                      ) : (
                        <Package size={36} color="#64748B" />
                      )}
                    </div>
                    
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#94A3B8',
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

        {/* Popular Nearby Section */}
        <section>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: 14,
          }}>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{
                width: 4,
                height: 20,
                background: 'linear-gradient(135deg, #7C3AED, #3B82F6)',
                borderRadius: 4,
                boxShadow: '0 0 10px rgba(124, 58, 237, 0.4)',
              }} />
              <h2 style={{ 
                fontSize: 18, 
                fontWeight: 700, 
                margin: 0, 
                color: '#F8FAFC',
              }}>
                Популярно рядом
              </h2>
            </div>
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
                  color: '#3B82F6',
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
              background: 'rgba(10, 15, 26, 0.6)',
              borderRadius: 16,
              padding: 28,
              textAlign: 'center',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{
                width: 64,
                height: 64,
                margin: '0 auto 16px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(124, 58, 237, 0.2))',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 30px rgba(59, 130, 246, 0.2)',
              }}>
                <MapPin size={28} color="#3B82F6" />
              </div>
              <p style={{ fontSize: 14, color: '#94A3B8', margin: '0 0 20px' }}>
                Укажите местоположение, чтобы увидеть товары рядом
              </p>
              <button
                onClick={() => setShowLocationSettings(true)}
                style={{
                  padding: '14px 28px',
                  background: 'linear-gradient(135deg, #3B82F6, #7C3AED)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
                }}
                data-testid="button-set-location"
              >
                Указать местоположение
              </button>
            </div>
          ) : adsLoading ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <Loader2 
                size={32} 
                style={{ 
                  color: '#3B82F6',
                  animation: 'spin 1s linear infinite',
                  filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))',
                }} 
              />
            </div>
          ) : popularAds.length === 0 ? (
            <div style={{
              background: 'rgba(10, 15, 26, 0.6)',
              borderRadius: 16,
              padding: 24,
              textAlign: 'center',
              border: '1px solid rgba(59, 130, 246, 0.15)',
              backdropFilter: 'blur(10px)',
            }}>
              <Sparkles size={28} color="#64748B" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
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
                    width: 150,
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
    ? `/api/media/proxy?url=${encodeURIComponent(ad.photos[0])}&w=300&h=300`
    : null;

  const isFree = ad.price === 0;

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        background: 'rgba(10, 15, 26, 0.8)',
        border: '1px solid rgba(59, 130, 246, 0.15)',
        borderRadius: 14,
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
        overflow: 'hidden',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
        e.currentTarget.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.15)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      data-testid={`ad-popular-${ad._id}`}
    >
      <div style={{
        width: '100%',
        height: 110,
        background: '#0A0F1A',
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
            color: '#475569',
          }}>
            <Package size={28} />
          </div>
        )}
        
        {/* Distance chip */}
        {ad.distanceKm !== undefined && (
          <div style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            background: 'rgba(10, 15, 26, 0.85)',
            backdropFilter: 'blur(8px)',
            padding: '4px 8px',
            borderRadius: 10,
            fontSize: 10,
            fontWeight: 600,
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            border: '1px solid rgba(59, 130, 246, 0.2)',
          }}>
            <MapPin size={10} color="#3B82F6" />
            {formatDistance(ad.distanceKm)}
          </div>
        )}
      </div>
      
      <div style={{ padding: '10px 12px' }}>
        <div style={{
          fontSize: 15,
          fontWeight: 700,
          color: isFree ? '#10B981' : '#3B82F6',
          marginBottom: 4,
          fontFamily: "'JetBrains Mono', monospace",
          textShadow: isFree 
            ? '0 0 10px rgba(16, 185, 129, 0.5)' 
            : '0 0 10px rgba(59, 130, 246, 0.5)',
        }}>
          {isFree ? 'ДАРОМ' : formatPrice(ad.price, ad.currency)}
        </div>
        
        <div style={{
          fontSize: 12,
          color: '#64748B',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {ad.title}
        </div>
      </div>
    </button>
  );
}
