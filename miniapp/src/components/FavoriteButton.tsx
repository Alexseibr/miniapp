import { useState } from 'react';
import { useIsFavorite, useUserStore } from '@/store/useUserStore';

interface Props {
  adId: string;
}

export default function FavoriteButton({ adId }: Props) {
  const isFavorite = useIsFavorite(adId);
  const toggleFavorite = useUserStore((state) => state.toggleFavorite);
  const status = useUserStore((state) => state.status);
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    try {
      setPending(true);
      await toggleFavorite(adId, isFavorite);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Не удалось обновить избранное');
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending || status === 'loading'}
      style={{
        border: 'none',
        background: 'transparent',
        color: isFavorite ? '#ef4444' : '#94a3b8',
        fontSize: '1.4rem',
        cursor: 'pointer',
      }}
      aria-label={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
    >
      {isFavorite ? '❤️' : '🤍'}
    </button>
  );
}
