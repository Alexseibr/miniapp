import { create } from 'zustand';
import { validateSession } from '@/api/telegramAuth';
import { addFavorite, fetchFavorites, removeFavorite } from '@/api/favorites';
import { FavoriteItem, UserProfile } from '@/types';

export interface UserState {
  user: UserProfile | null;
  cityCode: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error' | 'need_phone' | 'guest';
  error?: string;
  favorites: FavoriteItem[];
  initialize: () => Promise<void>;
  refreshFavorites: () => Promise<void>;
  toggleFavorite: (adId: string, isFavorite: boolean) => Promise<void>;
  setCityCode: (cityCode: string) => void;
  submitPhone: (phone: string) => Promise<void>;
  skipPhoneRequest: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  cityCode: null,
  status: 'idle',
  error: undefined,
  favorites: [],
  async initialize() {
    if (get().status === 'loading') return;
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      set({ status: 'ready', cityCode: 'brest' });
      return;
    }
    
    // Проверяем localStorage - отказался ли пользователь от номера
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const phoneSkipped = localStorage.getItem(`phone_skipped_${telegramId}`);
    
    try {
      set({ status: 'loading', error: undefined });
      const response = await validateSession(initData);
      if (response.user) {
        // Проверяем есть ли номер телефона
        if (!response.user.phone && !phoneSkipped) {
          set({ status: 'need_phone', cityCode: 'brest' });
          return;
        }
        
        // Если номер пропущен - режим гостя
        if (!response.user.phone && phoneSkipped) {
          set({ 
            status: 'guest',
            cityCode: 'brest'
          });
          return;
        }
        
        set({ 
          user: response.user as UserProfile,
          cityCode: (response as any).cityCode || 'brest'
        });
        await get().refreshFavorites();
        set({ status: 'ready' });
      } else {
        set({ status: 'ready' });
      }
    } catch (error) {
      console.error('MiniApp auth error', error);
      set({ status: 'error', error: 'Не удалось пройти авторизацию', cityCode: 'brest' });
    }
  },
  async submitPhone(phone: string) {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      set({ status: 'error', error: 'Telegram данные недоступны' });
      return;
    }
    try {
      set({ status: 'loading', error: undefined });
      const response = await validateSession(initData, phone);
      if (response.user) {
        set({ 
          user: response.user as UserProfile,
          cityCode: (response as any).cityCode || 'brest',
          status: 'ready'
        });
        await get().refreshFavorites();
      } else {
        set({ status: 'error', error: 'Не удалось сохранить номер телефона' });
      }
    } catch (error) {
      console.error('Phone submit error', error);
      set({ status: 'error', error: 'Не удалось сохранить номер телефона' });
    }
  },
  skipPhoneRequest() {
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (telegramId) {
      localStorage.setItem(`phone_skipped_${telegramId}`, 'true');
    }
    set({ status: 'guest', cityCode: 'brest' });
  },
  setCityCode(cityCode: string) {
    set({ cityCode });
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
