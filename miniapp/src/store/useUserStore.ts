import { create } from 'zustand';
import { validateSession } from '@/api/telegramAuth';
import { addFavorite, fetchFavorites, removeFavorite } from '@/api/favorites';
import { FavoriteItem, UserProfile } from '@/types';

interface UserState {
  user: UserProfile | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  favorites: FavoriteItem[];
  initialize: () => Promise<void>;
  refreshFavorites: () => Promise<void>;
  toggleFavorite: (adId: string, isFavorite: boolean) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  status: 'idle',
  error: undefined,
  favorites: [],
  async initialize() {
    if (get().status === 'loading') return;
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      set({ status: 'ready' });
      return;
    }
    try {
      set({ status: 'loading', error: undefined });
      const response = await validateSession(initData);
      if (response.user) {
        set({ user: response.user as UserProfile });
        await get().refreshFavorites();
      }
      set({ status: 'ready' });
    } catch (error) {
      console.error('MiniApp auth error', error);
      set({ status: 'error', error: 'Не удалось пройти авторизацию' });
    }
  },
  async refreshFavorites() {
    const telegramId = get().user?.telegramId;
    if (!telegramId) {
      set({ favorites: [] });
      return;
    }
    try {
      const response = await fetchFavorites(telegramId);
      set({ favorites: response.items || [] });
    } catch (error) {
      console.error('favorites fetch error', error);
    }
  },
  async toggleFavorite(adId, isFavorite) {
    const telegramId = get().user?.telegramId;
    if (!telegramId) {
      throw new Error('Для добавления в избранное нужно авторизоваться');
    }
    if (isFavorite) {
      await removeFavorite(telegramId, adId);
    } else {
      await addFavorite(telegramId, adId);
    }
    await get().refreshFavorites();
  },
}));

export function useIsFavorite(adId?: string) {
  const favorites = useUserStore((state) => state.favorites);
  if (!adId) return false;
  return favorites.some((fav) => fav.adId === adId || fav.ad?._id === adId);
}
