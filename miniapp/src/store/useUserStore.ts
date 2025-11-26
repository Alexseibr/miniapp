import { create } from 'zustand';
import { validateSession } from '@/api/telegramAuth';
import { fetchFavorites, toggleFavorite as apiToggleFavorite } from '@/api/favorites';
import { FavoriteItem, UserProfile } from '@/types';

export interface UserState {
  user: UserProfile | null;
  cityCode: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error' | 'need_phone' | 'guest';
  error?: string;
  favorites: FavoriteItem[];
  favoritesLoading: boolean;
  favoriteIds: Set<string>;
  initialize: () => Promise<void>;
  refreshFavorites: (userLat?: number, userLng?: number) => Promise<void>;
  toggleFavorite: (adId: string) => Promise<boolean>;
  isFavorite: (adId: string) => boolean;
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
  favoritesLoading: false,
  favoriteIds: new Set(),

  async initialize() {
    if (get().status === 'loading') {
      return;
    }
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      set({ status: 'ready', cityCode: 'brest' });
      return;
    }
    
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const phoneSkipped = localStorage.getItem(`phone_skipped_${telegramId}`);
    
    try {
      set({ status: 'loading', error: undefined });
      const response = await validateSession(initData);
      
      if (response.user) {
        if (!response.user.phone && !phoneSkipped) {
          set({ status: 'need_phone', cityCode: 'brest' });
          return;
        }
        
        if (!response.user.phone && phoneSkipped) {
          set({ 
            user: response.user as UserProfile,
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
    const telegramData = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (telegramData?.id) {
      localStorage.setItem(`phone_skipped_${telegramData.id}`, 'true');
      
      const guestUser: UserProfile = {
        id: '',
        telegramId: telegramData.id,
        username: telegramData.username || '',
        firstName: telegramData.first_name || '',
        lastName: telegramData.last_name || '',
        phone: undefined,
        phoneVerified: false,
        role: 'buyer'
      };
      
      set({ 
        user: guestUser,
        status: 'guest', 
        cityCode: 'brest' 
      });
    } else {
      set({ status: 'guest', cityCode: 'brest' });
    }
  },

  setCityCode(cityCode: string) {
    set({ cityCode });
  },

  async refreshFavorites(userLat?: number, userLng?: number) {
    const telegramId = get().user?.telegramId;
    if (!telegramId) {
      set({ favorites: [], favoriteIds: new Set() });
      return;
    }
    try {
      set({ favoritesLoading: true });
      const response = await fetchFavorites(userLat, userLng);
      const validItems = (response.items || []).filter(item => item.ad);
      const ids = new Set(validItems.map(item => item.adId || item.ad?._id).filter(Boolean) as string[]);
      set({ favorites: validItems, favoriteIds: ids, favoritesLoading: false });
    } catch (error) {
      console.error('refreshFavorites error:', error);
      set({ favorites: [], favoriteIds: new Set(), favoritesLoading: false });
    }
  },

  async toggleFavorite(adId: string) {
    const telegramId = get().user?.telegramId;
    if (!telegramId) {
      throw new Error('Для добавления в избранное нужно авторизоваться');
    }

    const currentIds = get().favoriteIds;
    const wasAdded = currentIds.has(adId);

    const newIds = new Set(currentIds);
    if (wasAdded) {
      newIds.delete(adId);
      set((state) => ({
        favoriteIds: newIds,
        favorites: state.favorites.filter((f) => f.adId !== adId && f.ad?._id !== adId),
      }));
    } else {
      newIds.add(adId);
      set({ favoriteIds: newIds });
    }

    try {
      const result = await apiToggleFavorite(adId);
      const isNowFavorite = result.status === 'added';
      
      if (isNowFavorite !== !wasAdded) {
        await get().refreshFavorites();
      }
      
      return isNowFavorite;
    } catch (error) {
      const revertIds = new Set(currentIds);
      set({ favoriteIds: revertIds });
      await get().refreshFavorites();
      throw error;
    }
  },

  isFavorite(adId: string) {
    return get().favoriteIds.has(adId);
  },
}));

export function useIsFavorite(adId?: string) {
  const favoriteIds = useUserStore((state) => state.favoriteIds);
  if (!adId) return false;
  return favoriteIds.has(adId);
}
