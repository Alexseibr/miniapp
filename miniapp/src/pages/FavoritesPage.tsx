import { useEffect } from 'react';
import AdCard from '@/components/AdCard';
import EmptyState from '@/widgets/EmptyState';
import { useUserStore } from '@/store/useUserStore';

export default function FavoritesPage() {
  const favorites = useUserStore((state) => state.favorites);
  const refreshFavorites = useUserStore((state) => state.refreshFavorites);
  const user = useUserStore((state) => state.user);

  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  if (!user) {
    return (
      <EmptyState
        title="Авторизуйтесь через Telegram"
        description="Мини-приложение автоматически подтянет ваш профиль при запуске из Telegram"
      />
    );
  }

  if (!favorites.length) {
    return <EmptyState title="Избранных объявлений пока нет" description="Нажмите на сердечко в карточке, чтобы сохранить объявление" />;
  }

  return (
    <div className="container">
      <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
        {favorites.map((favorite) => favorite.ad && <AdCard key={favorite.adId} ad={favorite.ad} />)}
      </div>
    </div>
  );
}
