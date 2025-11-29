import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Heart, MapPin, Clock, Loader2, Plus } from 'lucide-react';
import ScreenLayout from '@/components/layout/ScreenLayout';
import { useGeo, formatDistance } from '@/utils/geo';
import { useUserStore, useIsFavorite } from '@/store/useUserStore';
import http from '@/api/http';
import { AdPreview } from '@/types';
import { NO_PHOTO_PLACEHOLDER, getThumbnailUrl } from '@/constants/placeholders';

interface GiveawayAd extends AdPreview {
  distanceKm?: number;
  giveawaySubcategoryId?: string;
}

interface GiveawaysResponse {
  success: boolean;
  ads: GiveawayAd[];
  total: number;
  hasMore: boolean;
}

const GIVEAWAY_SUBCATEGORIES = [
  { id: 'all', name: 'Все' },
  { id: 'clothes', name: 'Одежда' },
  { id: 'kids', name: 'Детские вещи' },
  { id: 'furniture', name: 'Мебель' },
  { id: 'electronics', name: 'Техника' },
  { id: 'other', name: 'Прочее' },
];

const LIMIT = 20;

function formatRussianDate(dateString?: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day} ${month}, ${hours}:${minutes}`;
  } catch {
    return '';
  }
}

function formatDistanceText(distanceKm?: number): string {
  if (distanceKm == null || isNaN(distanceKm)) return '';
  
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} м от вас`;
  }
  
  return `${distanceKm.toFixed(1)} км от вас`;
}

interface GiveawayCardProps {
  ad: GiveawayAd;
  onClick: () => void;
}

function GiveawayCard({ ad, onClick }: GiveawayCardProps) {
  const toggleFavorite = useUserStore((state) => state.toggleFavorite);
  const isFavorite = useIsFavorite(ad._id);
  const [pending, setPending] = useState(false);
  
  const photo = ad.photos && ad.photos.length > 0 
    ? getThumbnailUrl(ad.photos[0]) 
    : NO_PHOTO_PLACEHOLDER;

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    try {
      await toggleFavorite(ad._id);
    } finally {
      setPending(false);
    }
  };

  return (
    <article
      onClick={onClick}
      role="button"
      tabIndex={0}
      data-testid={`giveaway-card-${ad._id}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      <div 
        style={{
          position: 'relative',
          aspectRatio: '4/5',
          background: '#F5F6F8',
          overflow: 'hidden',
          borderRadius: 16,
        }}
      >
        <img
          src={photo}
          alt={ad.title}
          loading="lazy"
          decoding="async"
          data-testid={`giveaway-image-${ad._id}`}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
          }}
        />
        
        <div
          data-testid={`giveaway-badge-${ad._id}`}
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: '#EC4899',
            color: '#FFFFFF',
            padding: '4px 10px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            zIndex: 10,
          }}
        >
          Даром
        </div>
        
        <button
          onClick={handleFavoriteClick}
          disabled={pending}
          data-testid={`button-favorite-${ad._id}`}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10,
            width: 32,
            height: 32,
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '50%',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: pending ? 'wait' : 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Heart
            size={18}
            fill={isFavorite ? '#EF4444' : 'none'}
            color={isFavorite ? '#EF4444' : '#9CA3AF'}
            strokeWidth={2}
          />
        </button>
      </div>

      <div style={{ padding: '12px 4px 8px' }}>
        <h3
          data-testid={`giveaway-title-${ad._id}`}
          style={{
            margin: '0 0 8px',
            fontSize: 14,
            fontWeight: 500,
            color: '#1F2937',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.4,
          }}
        >
          {ad.title}
        </h3>

        {ad.distanceKm != null && (
          <p
            data-testid={`giveaway-distance-${ad._id}`}
            style={{ 
              margin: '0 0 4px',
              fontSize: 12,
              color: '#6B7280',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <MapPin size={12} />
            {formatDistanceText(ad.distanceKm)}
          </p>
        )}

        {ad.createdAt && (
          <p
            data-testid={`giveaway-date-${ad._id}`}
            style={{ 
              margin: 0,
              fontSize: 12,
              color: '#9CA3AF',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Clock size={12} />
            {formatRussianDate(ad.createdAt)}
          </p>
        )}
      </div>
    </article>
  );
}

export default function GiveawayFeedPage() {
  const navigate = useNavigate();
  const { coords, status: geoStatus, requestLocation } = useGeo();
  
  const [ads, setAds] = useState<GiveawayAd[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [activeSubcategory, setActiveSubcategory] = useState('all');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!coords && geoStatus === 'idle') {
      requestLocation();
    }
  }, [coords, geoStatus, requestLocation]);

  const loadGiveaways = useCallback(async (subcategoryId: string, currentOffset: number, append: boolean = false) => {
    try {
      if (!append) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      
      const params = new URLSearchParams({
        limit: String(LIMIT),
        offset: String(currentOffset),
      });
      
      if (coords?.lat && coords?.lng) {
        params.append('lat', String(coords.lat));
        params.append('lng', String(coords.lng));
      }
      
      if (subcategoryId !== 'all') {
        params.append('subcategoryId', subcategoryId);
      }
      
      const response = await http.get<GiveawaysResponse>(`/api/search/giveaways?${params.toString()}`);
      const data = response.data;
      
      if (data.success) {
        if (append) {
          setAds(prev => [...prev, ...data.ads]);
        } else {
          setAds(data.ads);
        }
        setTotal(data.total);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('[GiveawayFeedPage] Failed to load giveaways:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [coords]);

  useEffect(() => {
    loadGiveaways(activeSubcategory, 0);
  }, [activeSubcategory, coords, loadGiveaways]);

  const handleSubcategoryChange = (subcategoryId: string) => {
    setActiveSubcategory(subcategoryId);
    setOffset(0);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      const newOffset = offset + LIMIT;
      setOffset(newOffset);
      loadGiveaways(activeSubcategory, newOffset, true);
    }
  };

  const handleCardClick = (adId: string) => {
    navigate(`/ads/${adId}`);
  };

  const handleCreateAd = () => {
    navigate('/create-giveaway');
  };

  const handleBack = () => {
    navigate(-1);
  };

  const isRequestingLocation = !coords && (geoStatus === 'loading' || geoStatus === 'idle');

  const headerContent = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
        }}
      >
        <button
          onClick={handleBack}
          data-testid="button-back"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: 'none',
            background: '#F5F6F8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={20} color="#1F2937" />
        </button>
        
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gift size={20} color="#EC4899" />
            <h1
              data-testid="text-page-title"
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: '#1F2937',
              }}
            >
              Даром отдаю
            </h1>
          </div>
          <p
            data-testid="text-ad-count"
            style={{
              margin: '2px 0 0',
              fontSize: 13,
              color: '#6B7280',
            }}
          >
            {total} объявлений
          </p>
        </div>
      </div>
    </div>
  );

  if (isRequestingLocation) {
    return (
      <ScreenLayout header={headerContent} showBottomNav={true}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Loader2
            size={48}
            color="#EC4899"
            style={{ animation: 'spin 1s linear infinite' }}
          />
          <p
            style={{
              marginTop: 16,
              fontSize: 16,
              color: '#6B7280',
            }}
          >
            Определяем местоположение...
          </p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout header={headerContent} showBottomNav={true}>
      <div
        data-testid="giveaway-feed-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100%',
          background: '#F5F6F8',
        }}
      >
        <div
          data-testid="info-banner"
          style={{
            margin: '12px 16px',
            padding: 16,
            background: '#FEE2E2',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#FECACA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Gift size={20} color="#DC2626" />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: '#991B1B',
              lineHeight: 1.4,
            }}
          >
            Здесь люди отдают вещи бесплатно. Заберите сегодня!
          </p>
        </div>

        <div
          ref={tabsContainerRef}
          data-testid="subcategory-tabs"
          style={{
            display: 'flex',
            gap: 8,
            padding: '0 16px 12px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {GIVEAWAY_SUBCATEGORIES.map((subcategory) => (
            <button
              key={subcategory.id}
              onClick={() => handleSubcategoryChange(subcategory.id)}
              data-testid={`tab-${subcategory.id}`}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: 'none',
                background: activeSubcategory === subcategory.id ? '#EC4899' : '#FFFFFF',
                color: activeSubcategory === subcategory.id ? '#FFFFFF' : '#6B7280',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
            >
              {subcategory.name}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <Loader2
              size={48}
              color="#EC4899"
              style={{ animation: 'spin 1s linear infinite' }}
            />
            <p
              style={{
                marginTop: 16,
                fontSize: 16,
                color: '#6B7280',
              }}
            >
              Загружаем объявления...
            </p>
          </div>
        ) : ads.length === 0 ? (
          <div
            data-testid="empty-state"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
              }}
            >
              <Gift size={36} color="#EC4899" />
            </div>
            
            <p
              style={{
                margin: '0 0 24px',
                fontSize: 16,
                color: '#6B7280',
                textAlign: 'center',
              }}
            >
              Пока никто ничего не отдает рядом...
            </p>
            
            <button
              onClick={handleCreateAd}
              data-testid="button-create-ad-empty"
              style={{
                padding: '14px 28px',
                background: '#EC4899',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Создать объявление
            </button>
          </div>
        ) : (
          <>
            <div
              data-testid="ads-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
                padding: '0 16px',
              }}
            >
              {ads.map((ad) => (
                <GiveawayCard
                  key={ad._id}
                  ad={ad}
                  onClick={() => handleCardClick(ad._id)}
                />
              ))}
            </div>

            {hasMore && (
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  data-testid="button-load-more"
                  style={{
                    padding: '12px 24px',
                    background: '#FFFFFF',
                    color: '#EC4899',
                    border: '1px solid #EC4899',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: isLoadingMore ? 'wait' : 'pointer',
                    opacity: isLoadingMore ? 0.6 : 1,
                  }}
                >
                  {isLoadingMore ? 'Загрузка...' : 'Показать ещё'}
                </button>
              </div>
            )}

            <div
              data-testid="cta-card"
              style={{
                margin: '24px 16px',
                padding: 20,
                background: '#3B73FC',
                borderRadius: 20,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Gift size={24} color="#FFFFFF" />
              </div>
              
              <h3
                style={{
                  margin: '0 0 8px',
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#FFFFFF',
                }}
              >
                Есть что отдать?
              </h3>
              
              <p
                style={{
                  margin: '0 0 16px',
                  fontSize: 14,
                  color: 'rgba(255, 255, 255, 0.85)',
                  lineHeight: 1.4,
                }}
              >
                Помогите другим и освободите место дома
              </p>
              
              <button
                onClick={handleCreateAd}
                data-testid="button-create-ad-cta"
                style={{
                  padding: '12px 24px',
                  background: '#FFFFFF',
                  color: '#3B73FC',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Plus size={18} />
                Создать объявление
              </button>
            </div>
          </>
        )}

        <div style={{ height: 24 }} />
      </div>
    </ScreenLayout>
  );
}
