import { useEffect, useState } from 'react';
import { Heart, Loader2, Bell } from 'lucide-react';
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
            background: 'rgba(10, 15, 26, 0.9)',
            border: '1px solid rgba(236, 72, 153, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 15px rgba(236, 72, 153, 0.3)',
            zIndex: 10,
            backdropFilter: 'blur(8px)',
          }}
          aria-label="Удалить из избранного"
          data-testid={`button-remove-favorite-${ad._id}`}
        >
          <Heart 
            size={18} 
            fill="#EC4899" 
            color="#EC4899" 
            style={{ filter: 'drop-shadow(0 0 5px rgba(236, 72, 153, 0.5))' }}
          />
        </button>

        {(favorite.notifyOnPriceChange || favorite.notifyOnStatusChange) && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              padding: '6px 10px',
              borderRadius: 12,
              background: 'rgba(59, 130, 246, 0.9)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(59, 130, 246, 0.5)',
              color: 'white',
              fontSize: 11,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)',
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
        minHeight: '100vh',
        flexDirection: 'column',
        gap: 16,
        background: '#000000',
      }}>
        <Loader2 
          size={36} 
          style={{ 
            color: '#3B82F6',
            animation: 'spin 1s linear infinite',
            filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))',
          }} 
        />
        <p style={{ color: '#64748B', fontSize: 15 }}>Загрузка избранного...</p>
      </div>
    );
  }

  if (!favorites.length) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          textAlign: 'center',
          padding: 32,
          background: 'rgba(10, 15, 26, 0.6)',
          borderRadius: 20,
          border: '1px solid rgba(59, 130, 246, 0.15)',
          backdropFilter: 'blur(10px)',
          maxWidth: 320,
        }}>
          <div style={{
            width: 72,
            height: 72,
            margin: '0 auto 20px',
            background: 'rgba(236, 72, 153, 0.15)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(236, 72, 153, 0.3)',
          }}>
            <Heart 
              size={32} 
              color="#EC4899" 
              style={{ filter: 'drop-shadow(0 0 8px rgba(236, 72, 153, 0.5))' }}
            />
          </div>
          <h2 style={{ 
            margin: '0 0 8px', 
            fontSize: 18, 
            fontWeight: 700, 
            color: '#F8FAFC' 
          }}>
            Избранных пока нет
          </h2>
          <p style={{ 
            margin: 0, 
            fontSize: 14, 
            color: '#64748B',
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
      background: '#000000',
      paddingBottom: 100,
    }}>
      {/* Background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: `
          radial-gradient(circle at 20% 20%, rgba(236, 72, 153, 0.06), transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.05), transparent 50%)
        `,
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'rgba(10, 15, 26, 0.9)',
        backdropFilter: 'blur(20px)',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
      }}>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(236, 72, 153, 0.5), transparent)',
        }} />
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 4,
              height: 24,
              background: 'linear-gradient(135deg, #EC4899, #3B82F6)',
              borderRadius: 4,
              boxShadow: '0 0 10px rgba(236, 72, 153, 0.4)',
            }} />
            <h1 style={{ 
              fontSize: 22, 
              fontWeight: 700, 
              color: '#F8FAFC',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <Heart 
                size={22} 
                color="#EC4899" 
                fill="#EC4899" 
                style={{ filter: 'drop-shadow(0 0 5px rgba(236, 72, 153, 0.5))' }}
              />
              Избранное
            </h1>
          </div>
          
          <span style={{
            padding: '6px 14px',
            background: 'rgba(236, 72, 153, 0.15)',
            border: '1px solid rgba(236, 72, 153, 0.3)',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 700,
            color: '#EC4899',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {favorites.length}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ padding: '16px', position: 'relative', zIndex: 1 }}>
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
    </div>
  );
}
