import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, Map } from 'lucide-react';
import GeoOnboarding from '@/components/GeoOnboarding';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { useGeo } from '@/utils/geo';
import { useNearbyAds } from '@/hooks/useNearbyAds';
import { AdPreview } from '@/types';
import AdCard from '@/components/AdCard';
import { useUserStore } from '@/store/useUserStore';

import electronicsIcon from '@assets/generated_images/electronics_phone_icon.webp';
import appliancesIcon from '@assets/generated_images/appliances_washing_machine_icon.webp';
import clothesIcon from '@assets/generated_images/clothes_fashion_icon.webp';
import homeGardenIcon from '@assets/generated_images/home_garden_icon.webp';
import kidsIcon from '@assets/generated_images/kids_baby_icon.webp';
import petsIcon from '@assets/generated_images/pets_animals_icon.webp';
import realEstateIcon from '@assets/generated_images/real_estate_house_icon.webp';
import servicesIcon from '@assets/generated_images/services_tools_icon.webp';
import travelIcon from '@assets/generated_images/travel_airplane_icon.webp';
import autoIcon from '@assets/generated_images/auto_car_icon.webp';
import hobbyIcon from '@assets/generated_images/hobby_sport_icon.webp';
import jobsIcon from '@assets/generated_images/jobs_briefcase_icon.webp';

const CATEGORIES = [
  { slug: 'nedvizhimost', label: 'Недвижимость', icon: realEstateIcon },
  { slug: 'uslugi', label: 'Услуги', icon: servicesIcon },
  { slug: 'puteshestviya', label: 'Путешествия', icon: travelIcon },
  { slug: 'remont-stroyka', label: 'Ремонт и стройка', icon: homeGardenIcon },
  { slug: 'avto', label: 'Авто и запчасти', icon: autoIcon },
  { slug: 'hobbi-sport', label: 'Хобби, спорт и туризм', icon: hobbyIcon },
  { slug: 'elektronika', label: 'Электроника', icon: electronicsIcon },
  { slug: 'bytovaya-tekhnika', label: 'Бытовая техника', icon: appliancesIcon },
  { slug: 'odezhda-obuv', label: 'Одежда и обувь', icon: clothesIcon },
  { slug: 'dom-sad', label: 'Дом и сад', icon: homeGardenIcon },
  { slug: 'deti', label: 'Товары для детей', icon: kidsIcon },
  { slug: 'zhivotnye', label: 'Животные', icon: petsIcon },
];

const DEFAULT_RADIUS_KM = 3;

export default function HomePage() {
  const navigate = useNavigate();
  const { loading: categoriesLoading, loadCategories } = useCategoriesStore();
  const user = useUserStore((state) => state.user);
  const { 
    coords, 
    radiusKm,
    hasCompletedOnboarding,
  } = useGeo(false);

  const [showOnboarding, setShowOnboarding] = useState(false);

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

  const handleMapClick = () => {
    navigate('/geo-feed');
  };

  if (showOnboarding) {
    return <GeoOnboarding onComplete={handleOnboardingComplete} />;
  }

  const userName = user?.firstName || user?.username || 'Гость';

  return (
    <div style={{ 
      paddingBottom: 100, 
      background: '#FFFFFF', 
      minHeight: '100vh',
    }}>
      {/* Welcome Card */}
      <div style={{ padding: '16px 16px 12px' }}>
        <div style={{
          background: '#F5F6F8',
          borderRadius: 20,
          padding: '24px 20px',
          textAlign: 'center',
        }}>
          <div style={{
            display: 'inline-block',
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '8px 20px',
            marginBottom: 12,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          }}>
            <span style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#3A7BFF',
              letterSpacing: '0.5px',
            }}>
              ketmar
            </span>
          </div>
          <h1 style={{
            fontSize: 20,
            fontWeight: 600,
            color: '#1F2937',
            margin: 0,
          }}>
            Привет, {userName}!
          </h1>
        </div>
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

      {/* Categories Grid */}
      <section style={{ padding: '0 12px 24px' }}>
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
            gap: 8,
          }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => handleCategoryClick(cat.slug)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '16px 8px 12px',
                  background: '#F5F6F8',
                  border: 'none',
                  borderRadius: 16,
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                }}
                data-testid={`category-${cat.slug}`}
              >
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  marginBottom: 8,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <img 
                    src={cat.icon} 
                    alt={cat.label}
                    style={{
                      width: '100%',
                      height: '100%',
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

      {/* All Ads Section */}
      <section style={{ padding: '0 16px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 16,
        }}>
          <h2 style={{ 
            fontSize: 18, 
            fontWeight: 700, 
            margin: 0, 
            color: '#1F2937',
          }}>
            Все объявления
          </h2>
          
          <span style={{
            fontSize: 14,
            color: '#9CA3AF',
          }}>
            {nearbyAds.length > 0 ? `${nearbyAds.length} объявлений` : ''}
          </span>
        </div>

        {adsLoading ? (
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
              Пока нет объявлений. Станьте первым!
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}>
            {nearbyAds.map((ad) => (
              <AdCard key={ad._id} ad={ad} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
