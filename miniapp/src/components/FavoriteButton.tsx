import { useState, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { useUserStore, useIsFavorite } from '@/store/useUserStore';

interface Props {
  adId: string;
  size?: number;
  showBackground?: boolean;
  style?: React.CSSProperties;
}

export default function FavoriteButton({ 
  adId, 
  size = 24, 
  showBackground = true,
  style = {},
}: Props) {
  const [pending, setPending] = useState(false);
  const [animating, setAnimating] = useState(false);
  const toggleFavorite = useUserStore((state) => state.toggleFavorite);
  const user = useUserStore((state) => state.user);
  const favorite = useIsFavorite(adId);

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (pending || !user?.telegramId) return;
    
    setPending(true);
    setAnimating(true);
    
    try {
      await toggleFavorite(adId);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setPending(false);
      setTimeout(() => setAnimating(false), 300);
    }
  }, [adId, pending, toggleFavorite, user?.telegramId]);

  const buttonSize = showBackground ? size + 16 : size;

  return (
    <>
      <style>{`
        @keyframes heartPulse {
          0% { transform: scale(1); }
          25% { transform: scale(1.2); }
          50% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        .favorite-heart-animating {
          animation: heartPulse 0.3s ease-out;
        }
      `}</style>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending || !user?.telegramId}
        style={{
          border: 'none',
          background: showBackground 
            ? favorite 
              ? 'rgba(236, 72, 153, 0.1)' 
              : 'rgba(255, 255, 255, 0.95)'
            : 'transparent',
          borderRadius: '50%',
          width: buttonSize,
          height: buttonSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: pending ? 'wait' : 'pointer',
          transition: 'transform 0.15s ease, background 0.2s ease',
          boxShadow: showBackground ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
          transform: animating ? 'scale(1.1)' : 'scale(1)',
          ...style,
        }}
        aria-label={favorite ? 'Удалить из избранного' : 'Добавить в избранное'}
        data-testid={`button-favorite-${adId}`}
      >
        <Heart
          size={size}
          fill={favorite ? '#EC4899' : 'none'}
          color={favorite ? '#EC4899' : '#9CA3AF'}
          className={animating ? 'favorite-heart-animating' : ''}
          style={{
            transition: 'color 0.2s ease',
            opacity: pending ? 0.6 : 1,
          }}
        />
      </button>
    </>
  );
}
