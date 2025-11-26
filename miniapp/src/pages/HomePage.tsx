import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, Bell, MapPin, Map } from 'lucide-react';
import GeoOnboarding from '@/components/GeoOnboarding';
import LocationSettingsModal from '@/components/LocationSettingsModal';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { useGeo } from '@/utils/geo';
import { AdPreview } from '@/types';
import FavoriteButton from '@/components/FavoriteButton';
import { useUserStore } from '@/store/useUserStore';

import farmerMarketIcon from '@assets/generated_images/farmer_market_vegetables_icon.png';
import vegetablesIcon from '@assets/generated_images/fruits_vegetables_apple_icon.png';
import bakeryIcon from '@assets/generated_images/fresh_bakery_bread_icon.png';
import personalItemsIcon from '@assets/generated_images/personal_items_clothes_icon.png';
import clothesIcon from '@assets/generated_images/clothing_dress_icon.png';
import shoesIcon from '@assets/generated_images/footwear_sneaker_icon.png';
import householdIcon from '@assets/generated_images/home_household_items_icon.png';
import electronicsIcon from '@assets/generated_images/electronics_phone_icon.png';
import tractorIcon from '@assets/generated_images/farm_tractor_equipment_icon.png';
import servicesIcon from '@assets/generated_images/services_wrench_tool_icon.png';
import toolsIcon from '@assets/generated_images/tool_rental_repair_icon.png';
import giftIcon from '@assets/generated_images/free_giveaway_gift_icon.png';

const QUICK_CATEGORIES = [
  { slug: 'farmer-market', label: 'Фермерский рынок', icon: farmerMarketIcon, bgColor: '#E8F5E9' },
  { slug: 'ovoschi-frukty', label: 'Овощи/фрукты', icon: vegetablesIcon, bgColor: '#FFEBEE' },
  { slug: 'vypechka', label: 'Выпечка свежая', icon: bakeryIcon, bgColor: '#FFF8E1' },
  { slug: 'lichnye-veshchi', label: 'Личные вещи', icon: personalItemsIcon, bgColor: '#E3F2FD' },
  { slug: 'odezhda', label: 'Одежда', icon: clothesIcon, bgColor: '#E0F7FA' },
  { slug: 'obuv', label: 'Обувь', icon: shoesIcon, bgColor: '#E0F7FA' },
  { slug: 'bytovye-melochi', label: 'Бытовые мелочи', icon: householdIcon, bgColor: '#FFF3E0' },
  { slug: 'elektronika', label: 'Телефоны & Электроника', icon: electronicsIcon, bgColor: '#ECEFF1' },
  { slug: 'selhoztekhnika', label: 'Сельхоз техника', icon: tractorIcon, bgColor: '#FFF8E1' },
  { slug: 'uslugi', label: 'Услуги', icon: servicesIcon, bgColor: '#ECEFF1' },
  { slug: 'arenda', label: 'Аренда инструмента', icon: toolsIcon, bgColor: '#ECEFF1' },
  { slug: 'darom', label: 'Даром отдаю', icon: giftIcon, bgColor: '#FCE4EC', isHot: true },
];

const RADIUS_STEPS = [0.3, 1, 3, 5, 10, 20];
const MIN_ADS_COUNT = 8;

export default function HomePage() {
  const navigate = useNavigate();
  const { loading: categoriesLoading, loadCategories } = useCategoriesStore();
  const user = useUserStore((state) => state.user);
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
  const [nearbyAds, setNearbyAds] = useState<AdPreview[]>([]);
  const [currentRadius, setCurrentRadius] = useState(RADIUS_STEPS[0]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [geoError, setGeoError] = useState(false);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!hasCompletedOnboarding && !coords) {
      setShowOnboarding(true);
    }
  }, [hasCompletedOnboarding, coords]);

  const fetchNearbyAds = useCallback(async () => {
    if (!coords) return;
    
    setAdsLoading(true);
    setGeoError(false);
    
    try {
      let foundAds: AdPreview[] = [];
      let usedRadius = RADIUS_STEPS[0];

      for (const radius of RADIUS_STEPS) {
        try {
          const response = await fetch(
            `/api/ads/nearby?lat=${coords.lat}&lng=${coords.lng}&radiusKm=${radius}&limit=20`
          );
          
          if (response.ok) {
            const data = await response.json();
            const items = data?.items || (Array.isArray(data) ? data : []);
            if (items.length > 0) {
              foundAds = items;
              usedRadius = radius;
              if (foundAds.length >= MIN_ADS_COUNT) {
                break;
              }
            }
          }
        } catch (err) {
          console.error(`Failed to fetch ads at radius ${radius}km:`, err);
        }
      }
      
      setNearbyAds(foundAds);
      setCurrentRadius(foundAds.length > 0 ? usedRadius : RADIUS_STEPS[RADIUS_STEPS.length - 1]);
    } catch (error) {
      console.error('Failed to fetch nearby ads:', error);
      setGeoError(true);
    } finally {
      setAdsLoading(false);
    }
  }, [coords]);

  useEffect(() => {
    if (coords) {
      fetchNearbyAds();
    }
  }, [coords, fetchNearbyAds]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleSearchClick = () => {
    navigate('/search');
  };

  const handleCategoryClick = (slug: string) => {
    navigate(`/category/${encodeURIComponent(slug)}`);
  };

  const handleMapClick = () => {
    navigate('/geo-feed');
  };

  const handleAdClick = (ad: AdPreview) => {
    navigate(`/ads/${ad._id}`);
  };

  const handleRetryLocation = () => {
    requestLocation();
  };

  if (showOnboarding) {
    return <GeoOnboarding onComplete={handleOnboardingComplete} />;
  }

  const isAdFresh = (ad: AdPreview) => {
    if (!ad.createdAt) return false;
    const createdDate = new Date(ad.createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  };

  return (
    <div style={{ 
      background: '#FFFFFF', 
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Sticky Header + Search - stays fixed at top */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: '#FFFFFF',
        zIndex: 50,
        paddingTop: 'env(safe-area-inset-top)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#3A7BFF',
            margin: 0,
            letterSpacing: '-0.5px',
          }}>
            KETMAR
          </h1>
          
          <button
            style={{
              width: 44,
              height: 44,
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
            <Bell size={22} color="#6B7280" />
            <div style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 8,
              height: 8,
              background: '#EF4444',
              borderRadius: '50%',
              border: '2px solid #FFFFFF',
            }} />
          </button>
        </div>

        {/* Sticky Search Bar */}
        <div style={{ padding: '0 16px 12px' }}>
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
              borderRadius: 14,
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
      </div>

      {/* Scrollable Content - uses body scroll, flex fills remaining space */}
      <div style={{ 
        flex: 1,
        paddingBottom: 100,
      }}>
        {/* Quick Categories */}
        <section style={{ padding: '8px 16px 24px' }}>
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
                    padding: '14px 8px 12px',
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
                    width: 64,
                    height: 64,
                    background: cat.bgColor,
                    borderRadius: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                    overflow: 'hidden',
                  }}>
                    <img 
                      src={cat.icon} 
                      alt={cat.label}
                      style={{
                        width: 48,
                        height: 48,
                        objectFit: 'contain',
                      }}
                      loading="lazy"
                    />
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
            alignItems: 'flex-start', 
            marginBottom: 16,
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
                В радиусе {currentRadius} км
              </p>
            </div>
            
            <button
              onClick={handleMapClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                background: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: 20,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                color: '#1F2937',
              }}
              data-testid="button-map"
            >
              <Map size={18} color="#3A7BFF" />
              Карта
            </button>
          </div>

          {!coords ? (
            <div style={{
              background: '#F8F9FB',
              borderRadius: 16,
              padding: 28,
              textAlign: 'center',
            }}>
              <MapPin size={32} color="#9CA3AF" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 16px' }}>
                {geoError 
                  ? 'Не удалось определить местоположение'
                  : 'Укажите местоположение, чтобы увидеть товары рядом'
                }
              </p>
              <button
                onClick={geoError ? handleRetryLocation : () => setShowLocationSettings(true)}
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
                {geoError ? 'Повторить попытку' : 'Указать местоположение'}
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
            }}>
              <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
                Рядом с вами пока нет объявлений. Попробуйте изменить категорию или добавить своё объявление.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
            }}>
              {nearbyAds.map((ad) => (
                <NearbyAdCard 
                  key={ad._id} 
                  ad={ad} 
                  isFresh={isAdFresh(ad)}
                  onClick={() => handleAdClick(ad)} 
                />
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

function NearbyAdCard({ 
  ad, 
  isFresh,
  onClick 
}: { 
  ad: AdPreview; 
  isFresh: boolean;
  onClick: () => void;
}) {
  const formatPrice = (price: number, currency?: string) => {
    if (price === 0) return 'Даром';
    const symbol = currency === 'BYN' ? 'Br' : '₽';
    return `${symbol}${price.toLocaleString('ru-RU')}`;
  };

  const photoUrl = ad.photos?.[0] || '/placeholder-ad.jpg';
  const photoCount = ad.photos?.length || 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      }}
      data-testid={`nearby-ad-${ad._id}`}
    >
      <div style={{ 
        position: 'relative',
        aspectRatio: '4/3',
        background: '#F0F2F5',
      }}>
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
        
        {isFresh && (
          <div style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: '#10B981',
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 8,
          }}>
            Свежее
          </div>
        )}
        
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
        }}>
          <FavoriteButton 
            adId={ad._id} 
            size={20}
          />
        </div>

        {photoCount > 1 && (
          <div style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            background: 'rgba(0, 0, 0, 0.6)',
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: 500,
            padding: '4px 8px',
            borderRadius: 6,
          }}>
            1/{photoCount}
          </div>
        )}
      </div>
      
      <div style={{ padding: '12px' }}>
        <div style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#1F2937',
          marginBottom: 4,
        }}>
          {formatPrice(ad.price, ad.currency)}
        </div>
        
        <div style={{
          fontSize: 13,
          color: '#6B7280',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {ad.title}
        </div>
      </div>
    </div>
  );
}
