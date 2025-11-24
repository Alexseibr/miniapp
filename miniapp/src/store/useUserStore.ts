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
    console.log('🔄 UserStore.initialize() started');
    if (get().status === 'loading') {
      console.log('⚠️ Already loading, skipping');
      return;
    }
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      console.log('⚠️ No Telegram initData, setting ready');
      set({ status: 'ready', cityCode: 'brest' });
      return;
    }
    
    // Проверяем localStorage - отказался ли пользователь от номера
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const phoneSkipped = localStorage.getItem(`phone_skipped_${telegramId}`);
    console.log('📱 Telegram ID:', telegramId);
    console.log('🔍 Phone skipped:', phoneSkipped);
    
    try {
      set({ status: 'loading', error: undefined });
      console.log('📡 Calling validateSession...');
      const response = await validateSession(initData);
      console.log('✅ ValidateSession response:', response);
      
      if (response.user) {
        console.log('👤 User data:', response.user);
        console.log('📞 User phone:', response.user.phone);
        
        // Проверяем есть ли номер телефона
        if (!response.user.phone && !phoneSkipped) {
          console.log('🚨 NO PHONE & NOT SKIPPED → setting need_phone');
          set({ status: 'need_phone', cityCode: 'brest' });
          return;
        }
        
        // Если номер пропущен - режим гостя
        if (!response.user.phone && phoneSkipped) {
          console.log('👁️ NO PHONE & SKIPPED → setting guest mode');
          set({ 
            user: response.user as UserProfile,
            status: 'guest',
            cityCode: 'brest'
          });
          return;
        }
        
        console.log('✅ User has phone → setting ready');
        set({ 
          user: response.user as UserProfile,
          cityCode: (response as any).cityCode || 'brest'
        });
        await get().refreshFavorites();
        set({ status: 'ready' });
      } else {
        console.log('⚠️ No user in response → setting ready');
        set({ status: 'ready' });
      }
    } catch (error) {
      console.error('❌ MiniApp auth error', error);
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
      
      // Создаем минимальный объект пользователя из Telegram данных
      const guestUser: UserProfile = {
        id: '', // Будет установлен после первого API вызова
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
