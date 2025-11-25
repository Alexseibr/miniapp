import { useState, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { useUserStore, useIsFavorite } from '@/store/useUserStore';

interface Props {
  adId: string;
  size?: number;
}

export default function FavoriteButton({ adId, size = 24 }: Props) {
  const [pending, setPending] = useState(false);
  const [animating, setAnimating] = useState(false);
  const toggleFavorite = useUserStore((state) => state.toggleFavorite);
  const favorite = useIsFavorite(adId);

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (pending) return;
    
    setPending(true);
    
    if (!favorite) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 400);
    }
    
    try {
      await toggleFavorite(adId, favorite);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setPending(false);
    }
  }, [adId, favorite, pending, toggleFavorite]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={animating ? 'favorite-button--active' : ''}
      style={{
        border: 'none',
        background: favorite ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.9)',
        borderRadius: '50%',
        width: size + 16,
        height: size + 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: pending ? 'wait' : 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
      aria-label={favorite ? 'Удалить из избранного' : 'Добавить в избранное'}
      data-testid={`button-favorite-${adId}`}
    >
      <Heart
        size={size}
        fill={favorite ? '#ef4444' : 'none'}
        color={favorite ? '#ef4444' : '#94a3b8'}
        style={{
          transition: 'all 0.2s ease',
          opacity: pending ? 0.5 : 1,
        }}
      />
    </button>
  );
}
