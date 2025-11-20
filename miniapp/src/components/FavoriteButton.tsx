import { useState } from 'react';
import { useFavorites } from '@/features/favorites/useFavorites';

interface Props {
  adId: string;
}

export default function FavoriteButton({ adId }: Props) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    setPending(true);
    toggleFavorite(adId);
    setPending(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
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
