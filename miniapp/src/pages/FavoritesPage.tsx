import { useEffect, useState, useCallback } from 'react';
import { Heart, Loader2, Bell, MapPin, ChevronRight } from 'lucide-react';
import { useUserStore } from '@/store/useUserStore';
import AuthScreen from '@/components/AuthScreen';
import { FavoriteItem } from '@/types';
import { useNavigate } from 'react-router-dom';

interface FavoriteCardProps {
  favorite: FavoriteItem;
  index: number;
  onRemove: (adId: string) => void;
  removing: boolean;
  onClick: () => void;
}

function FavoriteCard({ favorite, index, onRemove, removing, onClick }: FavoriteCardProps) {
  const ad = favorite.ad;
  
  if (!ad) {
    return (
      <div
        style={{
          background: '#F5F6F8',
          borderRadius: 16,
          aspectRatio: '0.85',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 8,
          padding: 16,
        }}
        data-testid={`favorite-card-unavailable-${index}`}
      >
        <Heart size={24} color="#9CA3AF" />
        <p style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center' }}>
          Объявление недоступно
        </p>
      </div>
    );
  }

  const animationDelay = `${index * 50}ms`;
  const price = ad.price ? `${ad.price.toLocaleString('ru-RU')} руб.` : 'Цена не указана';
  const distanceText = ad.distanceKm != null 
    ? ad.distanceKm < 1 
      ? `${Math.round(ad.distanceKm * 1000)} м` 
      : `${ad.distanceKm.toFixed(1)} км`
    : null;

  const photoUrl = ad.photos?.[0] 
    ? ad.photos[0].startsWith('http') 
      ? ad.photos[0] 
      : `/api/media/photo/${encodeURIComponent(ad.photos[0])}`
    : null;

  return (
    <div
      className="favorite-card-animated"
      style={{ 
        animationDelay,
        opacity: removing ? 0.5 : 1,
        transform: removing ? 'scale(0.95)' : 'scale(1)',
        transition: 'opacity 0.2s, transform 0.2s',
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
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative', aspectRatio: '1', background: '#F0F2F5' }}>
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
              <Heart size={32} />
            </div>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(ad._id);
            }}
            disabled={removing}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.95)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: removing ? 'wait' : 'pointer',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              zIndex: 10,
              transition: 'transform 0.15s',
            }}
            aria-label="Удалить из избранного"
            data-testid={`button-remove-favorite-${ad._id}`}
          >
            <Heart 
              size={18} 
              fill="#EC4899" 
              color="#EC4899" 
              style={{ 
                animation: removing ? 'none' : 'heartbeat 1.5s ease-in-out infinite',
              }}
            />
          </button>

          {distanceText && (
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                padding: '4px 8px',
                borderRadius: 8,
                background: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                fontSize: 11,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <MapPin size={10} />
              {distanceText}
            </div>
          )}

          {(favorite as any).notifyOnPriceChange && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                padding: '4px 8px',
                borderRadius: 8,
                background: '#3A7BFF',
                color: 'white',
                fontSize: 10,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
              title="Уведомления включены"
            >
              <Bell size={10} />
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
            {price}
          </div>
          <div style={{
            fontSize: 13,
            color: '#4B5563',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: ad.geoLabel ? 4 : 0,
          }}>
            {ad.title}
          </div>
          {ad.geoLabel && (
            <div style={{
              fontSize: 11,
              color: '#9CA3AF',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}>
              <MapPin size={10} />
              {ad.geoLabel}
            </div>
          )}
        </div>
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
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { timeout: 5000, maximumAge: 60000 }
      );
    }
  }, []);

  useEffect(() => {
    if (!user?.telegramId) return;
    
    const loadFavorites = async () => {
      try {
        await refreshFavorites(userLocation?.lat, userLocation?.lng);
      } catch (error) {
        console.error('Failed to load favorites:', error);
      } finally {
        setIsInitialLoad(false);
      }
    };
    loadFavorites();
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

  const handleCardClick = useCallback((adId: string) => {
    navigate(`/ads/${adId}`);
  }, [navigate]);

  if (!user) {
    return <AuthScreen />;
  }

  if (isInitialLoad && favoritesLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: 16,
        background: '#FFFFFF',
      }}>
        <Loader2 
          size={36} 
          color="#3A7BFF"
          style={{ animation: 'spin 1s linear infinite' }} 
        />
        <p style={{ color: '#6B7280', fontSize: 15 }}>Загрузка избранного...</p>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes heartbeat {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .favorite-card-animated {
            animation: fadeIn 0.3s ease-out forwards;
            opacity: 0;
          }
        `}</style>
      </div>
    );
  }

  if (!favorites.length) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          textAlign: 'center',
          padding: 32,
          maxWidth: 320,
        }}>
          <div style={{
            width: 88,
            height: 88,
            margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #FEE2E2 0%, #FCE7F3 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Heart size={40} color="#EC4899" />
          </div>
          <h2 style={{ 
            margin: '0 0 12px', 
            fontSize: 22, 
            fontWeight: 700, 
            color: '#1F2937' 
          }}>
            Избранных пока нет
          </h2>
          <p style={{ 
            margin: '0 0 24px', 
            fontSize: 15, 
            color: '#6B7280',
            lineHeight: 1.5,
          }}>
            Нажмите ♥ на товаре, чтобы следить за изменениями цен и доступностью
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '12px 24px',
              background: '#3A7BFF',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            data-testid="button-browse-ads"
          >
            Смотреть объявления
            <ChevronRight size={18} />
          </button>
        </div>
        <style>{`
          @keyframes heartbeat {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#F5F6F8',
      paddingBottom: 100,
    }}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .favorite-card-animated {
          animation: fadeIn 0.3s ease-out forwards;
          opacity: 0;
        }
      `}</style>

      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: '#FFFFFF',
        padding: '16px 20px',
        borderBottom: '1px solid #E5E7EB',
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
        }}>
          <div>
            <h1 style={{ 
              fontSize: 22, 
              fontWeight: 700, 
              color: '#1F2937',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <Heart size={22} color="#EC4899" fill="#EC4899" />
              Избранное
            </h1>
            <p style={{
              margin: '4px 0 0',
              fontSize: 13,
              color: '#6B7280',
            }}>
              Следите за изменениями цен
            </p>
          </div>
          
          <span style={{
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #FEE2E2 0%, #FCE7F3 100%)',
            borderRadius: 20,
            fontSize: 15,
            fontWeight: 700,
            color: '#EC4899',
          }}>
            {favorites.length}
          </span>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}
          data-testid="favorites-grid"
        >
          {favorites.map((favorite, index) => (
            <FavoriteCard
              key={favorite.adId || favorite.ad?._id || index}
              favorite={favorite}
              index={index}
              onRemove={handleRemove}
              removing={removing === (favorite.adId || favorite.ad?._id)}
              onClick={() => handleCardClick(favorite.ad?._id || favorite.adId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
