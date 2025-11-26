import { useEffect, useState } from 'react';
import { Heart, Loader2, Bell, Trash2 } from 'lucide-react';
import AdCard from '@/components/AdCard';
import AuthScreen from '@/components/AuthScreen';
import { useUserStore } from '@/store/useUserStore';
import { FavoriteItem } from '@/types';

interface FavoriteCardProps {
  favorite: FavoriteItem;
  index: number;
  onRemove: (adId: string) => void;
}

function FavoriteCard({ favorite, index, onRemove }: FavoriteCardProps) {
  const ad = favorite.ad;
  
  // Если нет данных объявления, показываем placeholder
  if (!ad) {
    return (
      <div
        style={{
          background: '#F5F6F8',
          borderRadius: 16,
          aspectRatio: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 8,
          padding: 16,
        }}
      >
        <Heart size={24} color="#9CA3AF" />
        <p style={{ color: '#9CA3AF', fontSize: 12, textAlign: 'center' }}>
          Объявление недоступно
        </p>
      </div>
    );
  }

  const animationDelay = `${index * 50}ms`;

  return (
    <div
      className="my-ad-card--animated"
      style={{ animationDelay }}
      data-testid={`favorite-card-${ad._id}`}
    >
      <div style={{ position: 'relative' }}>
        <AdCard ad={ad} />
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(ad._id);
          }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#FFFFFF',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            zIndex: 10,
          }}
          aria-label="Удалить из избранного"
          data-testid={`button-remove-favorite-${ad._id}`}
        >
          <Heart size={18} fill="#EC4899" color="#EC4899" />
        </button>

        {(favorite as any).notifyOnPriceChange && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              padding: '6px 10px',
              borderRadius: 12,
              background: '#3A7BFF',
              color: 'white',
              fontSize: 11,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            title="Уведомления включены"
          >
            <Bell size={12} />
            <span>Уведомления</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FavoritesPage() {
  const favorites = useUserStore((state) => state.favorites);
  const refreshFavorites = useUserStore((state) => state.refreshFavorites);
  const toggleFavorite = useUserStore((state) => state.toggleFavorite);
  const user = useUserStore((state) => state.user);
  const [removing, setRemoving] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (!user?.telegramId || hasFetched) return;
    
    const loadFavorites = async () => {
      setIsLoading(true);
      try {
        await refreshFavorites();
        setHasFetched(true);
      } catch (error) {
        console.error('favorites load error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadFavorites();
  }, [user?.telegramId, refreshFavorites, hasFetched]);

  const handleRemove = async (adId: string) => {
    setRemoving(adId);
    try {
      await toggleFavorite(adId, true);
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    } finally {
      setRemoving(null);
    }
  };

  if (!user) {
    return <AuthScreen />;
  }

  if (isLoading) {
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
            width: 80,
            height: 80,
            margin: '0 auto 20px',
            background: '#FEE2E2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Heart size={36} color="#EC4899" />
          </div>
          <h2 style={{ 
            margin: '0 0 8px', 
            fontSize: 20, 
            fontWeight: 700, 
            color: '#1F2937' 
          }}>
            Избранных пока нет
          </h2>
          <p style={{ 
            margin: 0, 
            fontSize: 15, 
            color: '#6B7280',
            lineHeight: 1.5,
          }}>
            Нажмите на сердечко в карточке, чтобы сохранить объявление
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#FFFFFF',
      paddingBottom: 100,
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: '#FFFFFF',
        padding: '16px 20px',
        borderBottom: '1px solid #F0F2F5',
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
        }}>
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
          
          <span style={{
            padding: '6px 14px',
            background: '#FEE2E2',
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 600,
            color: '#EC4899',
          }}>
            {favorites.length}
          </span>
        </div>
      </div>

      {/* Grid */}
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
              key={favorite.adId}
              favorite={favorite}
              index={index}
              onRemove={handleRemove}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
