import { useEffect, useState } from 'react';
import { Heart, Loader2, Bell, BellOff } from 'lucide-react';
import AdCard from '@/components/AdCard';
import EmptyState from '@/widgets/EmptyState';
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
  if (!ad) return null;

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
            background: 'rgba(255, 255, 255, 0.95)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 10,
          }}
          aria-label="Удалить из избранного"
          data-testid={`button-remove-favorite-${ad._id}`}
        >
          <Heart size={20} fill="#ef4444" color="#ef4444" />
        </button>

        {(favorite.notifyOnPriceChange || favorite.notifyOnStatusChange) && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              padding: '4px 8px',
              borderRadius: 12,
              background: 'rgba(99, 102, 241, 0.9)',
              color: 'white',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
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

  useEffect(() => {
    const loadFavorites = async () => {
      setIsLoading(true);
      await refreshFavorites();
      setIsLoading(false);
    };
    loadFavorites();
  }, [refreshFavorites]);

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
        minHeight: '50vh',
        flexDirection: 'column',
        gap: 16,
      }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#3B73FC' }} />
        <p style={{ color: '#64748b', fontSize: 16 }}>Загрузка избранного...</p>
      </div>
    );
  }

  if (!favorites.length) {
    return (
      <EmptyState 
        title="Избранных объявлений пока нет" 
        description="Нажмите на сердечко в карточке, чтобы сохранить объявление"
      />
    );
  }

  return (
    <div className="container" style={{ paddingTop: 16, paddingBottom: 100 }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingLeft: 4,
        paddingRight: 4,
      }}>
        <h1 style={{ 
          fontSize: 24, 
          fontWeight: 700, 
          color: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <Heart size={24} color="#ef4444" fill="#ef4444" />
          Избранное
        </h1>
        <span style={{
          padding: '6px 12px',
          background: 'var(--bg-tertiary)',
          borderRadius: 20,
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--color-secondary)',
        }}>
          {favorites.length}
        </span>
      </div>

      <div className="ads-grid" data-testid="favorites-grid">
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
  );
}
