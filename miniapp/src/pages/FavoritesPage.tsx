import { useEffect } from 'react';
import AdCard from '@/components/AdCard';
import EmptyState from '@/widgets/EmptyState';
import AuthScreen from '@/components/AuthScreen';
import { useUserStore } from '@/store/useUserStore';

export default function FavoritesPage() {
  const favorites = useUserStore((state) => state.favorites);
  const refreshFavorites = useUserStore((state) => state.refreshFavorites);
  const user = useUserStore((state) => state.user);

  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  if (!user) {
    return <AuthScreen />;
  }

  if (!favorites.length) {
    return <EmptyState title="Избранных объявлений пока нет" description="Нажмите на сердечко в карточке, чтобы сохранить объявление" />;
  }

  return (
    <div className="container">
      <div className="ads-grid">
        {favorites.map((favorite) => favorite.ad && <AdCard key={favorite.adId} ad={favorite.ad} />)}
      </div>
    </div>
  );
}
