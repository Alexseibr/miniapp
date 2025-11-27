import { useEffect, useState, useCallback, useMemo } from 'react';
import { Heart, Loader2, MapPin, ChevronRight, AlertCircle, RefreshCw, TrendingDown, Clock, User, Tractor, Store, Sparkles, ChevronDown } from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';
import AuthScreen from '@/components/AuthScreen';
import { FavoriteItem, BuyerProfile, SimilarAd } from '@/types';
import { useNavigate } from 'react-router-dom';
import http from '@/api/http';
import { getThumbnailUrl, NO_PHOTO_PLACEHOLDER } from '@/constants/placeholders';

type SortOption = 'distance' | 'newest' | 'price_asc' | 'price_desc';

interface FavoriteCardProps {
  favorite: FavoriteItem;
  index: number;
  onRemove: (adId: string) => void;
  removing: boolean;
  onClick: () => void;
}

function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      className="skeleton-card"
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
        animationDelay: `${index * 100}ms`,
      }}
    >
      <div style={{ aspectRatio: '4/5', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
      <div style={{ padding: 12 }}>
        <div style={{ height: 20, width: '60%', background: '#f0f0f0', borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 14, width: '90%', background: '#f0f0f0', borderRadius: 4, marginBottom: 4 }} />
        <div style={{ height: 14, width: '70%', background: '#f0f0f0', borderRadius: 4 }} />
      </div>
    </div>
  );
}

function FavoriteCard({ favorite, index, onRemove, removing, onClick }: FavoriteCardProps) {
  const ad = favorite.ad;
  
  if (!ad) {
    return (
      <div
        className="fade-in-card"
        style={{
          background: '#F5F5F5',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
          animationDelay: `${index * 50}ms`,
        }}
        data-testid={`favorite-card-unavailable-${index}`}
      >
        <div style={{ aspectRatio: '4/5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, padding: 24, background: '#EBEBEB' }}>
          <Heart size={32} color="#BDBDBD" />
          <p style={{ color: '#9E9E9E', fontSize: 13, textAlign: 'center', lineHeight: 1.4 }}>
            Товар недоступен,<br />возможно продан
          </p>
        </div>
      </div>
    );
  }

  const isUnavailable = ad.isUnavailable || ad.status === 'sold' || ad.status === 'archived';
  const price = ad.price ? `${ad.price.toLocaleString('ru-RU')} руб.` : 'Цена не указана';
  const oldPrice = ad.oldPrice ? `${ad.oldPrice.toLocaleString('ru-RU')} руб.` : null;
  const priceDropPercent = ad.priceChangePercent && ad.priceChangePercent < 0 ? Math.abs(ad.priceChangePercent) : null;
  
  const distanceText = ad.distanceKm != null 
    ? ad.distanceKm < 0.1 
      ? '< 100 м' 
      : ad.distanceKm < 1 
        ? `${Math.round(ad.distanceKm * 100) * 10} м`
        : `${ad.distanceKm.toFixed(1)} км`
    : null;

  const photoUrl = ad.photos?.[0] 
    ? getThumbnailUrl(ad.photos[0])
    : null;

  const isToday = ad.updatedAt && new Date(ad.updatedAt).toDateString() === new Date().toDateString();
  
  const sellerIcon = ad.sellerType === 'farmer' ? Tractor : ad.sellerType === 'shop' ? Store : User;
  const SellerIcon = sellerIcon;

  return (
    <div
      className={`fade-in-card ${priceDropPercent ? 'price-drop-flash' : ''}`}
      style={{
        animationDelay: `${index * 50}ms`,
        opacity: removing ? 0.5 : isUnavailable ? 0.6 : 1,
        transform: removing ? 'scale(0.95)' : 'scale(1)',
        transition: 'opacity 0.2s, transform 0.2s',
        filter: isUnavailable ? 'grayscale(0.5)' : 'none',
      }}
      data-testid={`favorite-card-${ad._id}`}
    >
      <div
        onClick={onClick}
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          cursor: isUnavailable ? 'default' : 'pointer',
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative', aspectRatio: '4/5', background: '#F5F5F5' }}>
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
              color: '#BDBDBD',
            }}>
              <Heart size={40} />
            </div>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(ad._id);
            }}
            disabled={removing}
            className="heart-button"
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.95)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: removing ? 'wait' : 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              zIndex: 10,
            }}
            aria-label="Удалить из избранного"
            data-testid={`button-remove-favorite-${ad._id}`}
          >
            <Heart 
              size={20} 
              fill="#E53935" 
              color="#E53935"
            />
          </button>

          {priceDropPercent && priceDropPercent >= 3 && (
            <div
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                padding: '5px 10px',
                borderRadius: 8,
                background: '#4CAF50',
                color: 'white',
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <TrendingDown size={12} />
              -{priceDropPercent}%
            </div>
          )}

          {isToday && !priceDropPercent && (
            <div
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                padding: '5px 10px',
                borderRadius: 8,
                background: '#3A7BFF',
                color: 'white',
                fontSize: 11,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Clock size={10} />
              Сегодня
            </div>
          )}

          {isUnavailable && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                textAlign: 'center',
                padding: 16,
              }}
            >
              Товар недоступен
            </div>
          )}
        </div>

        <div style={{ padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <span style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#1A1A1A',
            }}>
              {price}
            </span>
            {oldPrice && (
              <span style={{
                fontSize: 13,
                color: '#9E9E9E',
                textDecoration: 'line-through',
              }}>
                {oldPrice}
              </span>
            )}
          </div>
          
          <div style={{
            fontSize: 14,
            color: '#424242',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: 8,
            minHeight: 40,
          }}>
            {ad.title}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {distanceText && (
              <div style={{
                fontSize: 12,
                color: '#6E6E6E',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <MapPin size={12} />
                {distanceText}
              </div>
            )}
            
            {ad.sellerType && (
              <div style={{
                fontSize: 11,
                color: '#9E9E9E',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}>
                <SellerIcon size={12} />
              </div>
            )}
          </div>

          {ad.categoryName && (
            <div style={{
              fontSize: 11,
              color: '#BDBDBD',
              marginTop: 6,
            }}>
              {ad.categoryName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ ad, onClick }: { ad: SimilarAd; onClick: () => void }) {
  const price = `${ad.price.toLocaleString('ru-RU')} руб.`;
  const distanceText = ad.distanceKm != null 
    ? ad.distanceKm < 0.1 
      ? '< 100 м' 
      : ad.distanceKm < 1 
        ? `${Math.round(ad.distanceKm * 100) * 10} м`
        : `${ad.distanceKm.toFixed(1)} км`
    : null;

  const photoUrl = ad.photos?.[0] 
    ? getThumbnailUrl(ad.photos[0])
    : null;

  return (
    <div
      onClick={onClick}
      style={{
        background: '#FFFFFF',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        cursor: 'pointer',
        minWidth: 140,
        maxWidth: 160,
        flexShrink: 0,
      }}
      data-testid={`recommendation-card-${ad._id}`}
    >
      <div style={{ aspectRatio: '1', background: '#F5F5F5', position: 'relative' }}>
        {photoUrl ? (
          <img src={photoUrl} alt={ad.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#BDBDBD' }}>
            <Sparkles size={24} />
          </div>
        )}
        {ad.priceAdvantage && ad.priceAdvantage > 0 && (
          <div style={{
            position: 'absolute',
            bottom: 6,
            left: 6,
            padding: '3px 6px',
            borderRadius: 6,
            background: '#4CAF50',
            color: 'white',
            fontSize: 10,
            fontWeight: 600,
          }}>
            -{ad.priceAdvantage}%
          </div>
        )}
      </div>
      <div style={{ padding: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 4 }}>{price}</div>
        <div style={{ fontSize: 12, color: '#616161', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {ad.title}
        </div>
        {distanceText && (
          <div style={{ fontSize: 11, color: '#9E9E9E', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
            <MapPin size={10} />
            {distanceText}
          </div>
        )}
      </div>
    </div>
  );
}

function BuyerProfileCard({ profile }: { profile: BuyerProfile }) {
  const segmentLabels = { A: 'Активный', B: 'Периодический', C: 'Редкий' };
  const sellerLabels = { private: 'частники', farmer: 'фермеры', shop: 'магазины', any: 'все' };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #F0F7FF 0%, #E8F4FD 100%)',
        borderRadius: 16,
        padding: 16,
        margin: '0 16px 16px',
      }}
      data-testid="buyer-profile-card"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Sparkles size={18} color="#3A7BFF" />
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>Ваш профиль покупателя</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#424242' }}>
        <div>• Средний бюджет: ~{profile.averageBudget.toLocaleString('ru-RU')} руб.</div>
        {profile.preferredCategories.length > 0 && (
          <div>• Интересы: {profile.preferredCategories.slice(0, 3).join(', ')}</div>
        )}
        <div>• Радиус поиска: до {profile.preferredRadius} км</div>
        <div>• Предпочтение: {sellerLabels[profile.preferredSellerType]}</div>
      </div>
    </div>
  );
}

export default function FavoritesPage() {
  const favorites = useUserStore((state) => state.favorites);
  const refreshFavorites = useUserStore((state) => state.refreshFavorites);
  const toggleFavorite = useUserStore((state) => state.toggleFavorite);
  const favoritesLoading = useUserStore((state) => state.favoritesLoading);
  const user = useUserStore((state) => state.user);
  
  const [removing, setRemoving] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [recommendations, setRecommendations] = useState<SimilarAd[]>([]);
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { timeout: 5000, maximumAge: 60000 }
      );
    }
  }, []);

  useEffect(() => {
    if (!user?.telegramId) return;
    
    const loadData = async () => {
      setHasError(false);
      try {
        await refreshFavorites(userLocation?.lat, userLocation?.lng);
        
        try {
          const [recsRes, profileRes] = await Promise.all([
            http.get('/api/favorites/recommendations'),
            http.get('/api/favorites/profile'),
          ]);
          if (recsRes.data?.items) setRecommendations(recsRes.data.items);
          if (profileRes.data) setBuyerProfile(profileRes.data);
        } catch (e) {
          console.log('Recommendations/profile not available');
        }
      } catch (error) {
        console.error('Failed to load favorites:', error);
        setHasError(true);
      } finally {
        setIsInitialLoad(false);
      }
    };
    loadData();
  }, [user?.telegramId, refreshFavorites, userLocation?.lat, userLocation?.lng]);

  const handleRemove = useCallback(async (adId: string) => {
    setRemoving(adId);
    try {
      await toggleFavorite(adId);
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    } finally {
      setTimeout(() => setRemoving(null), 300);
    }
  }, [toggleFavorite]);

  const handleCardClick = useCallback((adId: string, isUnavailable?: boolean) => {
    if (isUnavailable) return;
    navigate(`/ads/${adId}`);
  }, [navigate]);

  const handleRetry = useCallback(() => {
    setIsInitialLoad(true);
    setHasError(false);
    refreshFavorites(userLocation?.lat, userLocation?.lng)
      .catch(() => setHasError(true))
      .finally(() => setIsInitialLoad(false));
  }, [refreshFavorites, userLocation]);

  const sortedFavorites = useMemo(() => {
    if (!favorites.length) return [];
    
    return [...favorites].sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return (a.ad?.distanceKm ?? 999) - (b.ad?.distanceKm ?? 999);
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'price_asc':
          return (a.ad?.price ?? 0) - (b.ad?.price ?? 0);
        case 'price_desc':
          return (b.ad?.price ?? 0) - (a.ad?.price ?? 0);
        default:
          return 0;
      }
    });
  }, [favorites, sortBy]);

  const sortLabels: Record<SortOption, string> = {
    distance: 'По расстоянию',
    newest: 'По новизне',
    price_asc: 'Цена ↑',
    price_desc: 'Цена ↓',
  };

  if (!user) {
    return <AuthScreen />;
  }

  const styles = `
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }
    @keyframes priceFlash {
      0% { background-color: transparent; }
      50% { background-color: #EAFBF1; }
      100% { background-color: transparent; }
    }
    .skeleton-card {
      animation: fadeIn 0.3s ease-out forwards;
      opacity: 0;
    }
    .fade-in-card {
      animation: fadeIn 0.4s ease-out forwards;
      opacity: 0;
    }
    .price-drop-flash {
      animation: priceFlash 0.8s ease-out;
    }
    .heart-button:hover {
      transform: scale(1.1);
    }
    .heart-button:active {
      transform: scale(0.95);
    }
    .heart-button svg {
      transition: transform 0.2s;
    }
    .heart-button:hover svg {
      animation: pulse 0.6s ease-in-out;
    }
  `;

  if (isInitialLoad && favoritesLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAFAFA' }}>
        <style>{styles}</style>
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#FFFFFF', padding: '16px 20px', borderBottom: '1px solid #EEEEEE' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A1A1A', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Heart size={24} color="#E53935" fill="#E53935" />
            Избранное
          </h1>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} index={i} />)}
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <style>{styles}</style>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ width: 80, height: 80, margin: '0 auto 20px', background: '#FFEBEE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={40} color="#E53935" />
          </div>
          <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 600, color: '#1A1A1A' }}>Ошибка загрузки</h2>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6E6E6E', lineHeight: 1.5 }}>
            Не удалось загрузить избранное. Проверьте подключение к интернету.
          </p>
          <button
            onClick={handleRetry}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              background: '#3A7BFF',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            data-testid="button-retry"
          >
            <RefreshCw size={18} />
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!favorites.length) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <style>{styles}</style>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ width: 88, height: 88, margin: '0 auto 24px', background: 'linear-gradient(135deg, #FFEBEE 0%, #FCE4EC 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={44} color="#E53935" />
          </div>
          <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, color: '#1A1A1A' }}>
            Избранных пока нет
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: 15, color: '#6E6E6E', lineHeight: 1.5 }}>
            Нажмите ♥ на объявлении, чтобы следить за изменениями цен и доступностью.
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '14px 28px',
              background: '#3A7BFF',
              color: 'white',
              border: 'none',
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            data-testid="button-browse-ads"
          >
            Перейти к объявлениям рядом
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', paddingBottom: 100 }}>
      <style>{styles}</style>

      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: '#FFFFFF',
        padding: '16px 20px',
        borderBottom: '1px solid #EEEEEE',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1A1A1A', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Heart size={24} color="#E53935" fill="#E53935" />
            Избранное
          </h1>
          <span style={{
            padding: '6px 14px',
            background: '#FFEBEE',
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 700,
            color: '#E53935',
          }}>
            {favorites.length}
          </span>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: '#F5F5F5',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              color: '#424242',
              cursor: 'pointer',
            }}
            data-testid="button-sort"
          >
            {sortLabels[sortBy]}
            <ChevronDown size={16} style={{ transform: showSortMenu ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
          </button>

          {showSortMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 4,
              background: '#FFFFFF',
              borderRadius: 12,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
              overflow: 'hidden',
              zIndex: 30,
              minWidth: 160,
            }}>
              {(Object.keys(sortLabels) as SortOption[]).map((key) => (
                <button
                  key={key}
                  onClick={() => { setSortBy(key); setShowSortMenu(false); }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px 16px',
                    background: sortBy === key ? '#F5F5F5' : 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: 14,
                    color: sortBy === key ? '#3A7BFF' : '#424242',
                    fontWeight: sortBy === key ? 600 : 400,
                    cursor: 'pointer',
                  }}
                  data-testid={`sort-option-${key}`}
                >
                  {sortLabels[key]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {buyerProfile && <BuyerProfileCard profile={buyerProfile} />}

      <div style={{ padding: '0 16px 16px' }}>
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}
          data-testid="favorites-grid"
        >
          {sortedFavorites.map((favorite, index) => (
            <FavoriteCard
              key={favorite.adId || favorite.ad?._id || index}
              favorite={favorite}
              index={index}
              onRemove={handleRemove}
              removing={removing === (favorite.adId || favorite.ad?._id)}
              onClick={() => handleCardClick(favorite.ad?._id || favorite.adId, favorite.ad?.isUnavailable)}
            />
          ))}
        </div>
      </div>

      {recommendations.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="#3A7BFF" />
            <span style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A' }}>Мы подобрали для вас</span>
          </div>
          <div style={{ 
            display: 'flex', 
            gap: 12, 
            overflowX: 'auto', 
            padding: '0 16px 16px',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}>
            {recommendations.map((ad) => (
              <RecommendationCard
                key={ad._id}
                ad={ad}
                onClick={() => navigate(`/ads/${ad._id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
