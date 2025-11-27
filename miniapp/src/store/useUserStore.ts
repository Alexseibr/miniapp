import { create } from 'zustand';
import { validateSession } from '@/api/telegramAuth';
import { fetchFavorites, toggleFavorite as apiToggleFavorite } from '@/api/favorites';
import { FavoriteItem, UserProfile } from '@/types';
import { detectPlatform } from '@/platform/platformDetection';

const AUTH_TOKEN_KEY = 'ketmar_auth_token';
const API_BASE = import.meta.env.VITE_API_URL || '';

export interface UserState {
  user: UserProfile | null;
  cityCode: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error' | 'need_phone' | 'guest' | 'need_auth';
  error?: string;
  favorites: FavoriteItem[];
  favoritesLoading: boolean;
  favoriteIds: Set<string>;
  smsStep: 'phone' | 'code' | 'done';
  smsPending: boolean;
  smsError?: string;
  initialize: () => Promise<void>;
  refreshFavorites: (userLat?: number, userLng?: number) => Promise<void>;
  toggleFavorite: (adId: string) => Promise<boolean>;
  isFavorite: (adId: string) => boolean;
  setCityCode: (cityCode: string) => void;
  submitPhone: (phone: string) => Promise<void>;
  skipPhoneRequest: () => void;
  requestSmsCode: (phone: string) => Promise<boolean>;
  verifySmsCode: (phone: string, code: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  cityCode: null,
  status: 'idle',
  error: undefined,
  favorites: [],
  favoritesLoading: false,
  favoriteIds: new Set(),
  smsStep: 'phone',
  smsPending: false,
  smsError: undefined,

  async initialize() {
    if (get().status === 'loading') {
      return;
    }

    const platform = detectPlatform();

    if (platform === 'telegram') {
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
    } else {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      
      if (storedToken) {
        try {
          set({ status: 'loading', error: undefined });
          
          const response = await fetch(`${API_BASE}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.user) {
              set({ 
                user: data.user as UserProfile,
                status: 'ready',
                cityCode: data.cityCode || 'brest'
              });
              await get().refreshFavorites();
              return;
            }
          }
          
          localStorage.removeItem(AUTH_TOKEN_KEY);
          set({ status: 'need_auth', cityCode: 'brest' });
        } catch (error) {
          console.error('Web auth error', error);
          localStorage.removeItem(AUTH_TOKEN_KEY);
          set({ status: 'need_auth', cityCode: 'brest' });
        }
      } else {
        set({ status: 'need_auth', cityCode: 'brest' });
      }
    }
  },

  async requestSmsCode(phone: string) {
    try {
      set({ smsPending: true, smsError: undefined });
      
      const response = await fetch(`${API_BASE}/api/auth/sms/requestCode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      
      const data = await response.json();
      
      if (response.ok && data.ok) {
        set({ smsStep: 'code', smsPending: false });
        return true;
      } else {
        set({ 
          smsError: data.message || data.error || 'Не удалось отправить код', 
          smsPending: false 
        });
        return false;
      }
    } catch (error) {
      console.error('SMS request error:', error);
      set({ 
        smsError: 'Ошибка сети. Попробуйте ещё раз.', 
        smsPending: false 
      });
      return false;
    }
  },

  async verifySmsCode(phone: string, code: string) {
    try {
      set({ smsPending: true, smsError: undefined });
      
      const response = await fetch(`${API_BASE}/api/auth/sms/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      });
      
      const data = await response.json();
      
      if (response.ok && data.token) {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        
        set({ 
          user: data.user as UserProfile,
          status: 'ready',
          smsStep: 'done',
          smsPending: false,
          cityCode: data.cityCode || 'brest'
        });
        
        await get().refreshFavorites();
        return true;
      } else {
        set({ 
          smsError: data.message || data.error || 'Неверный код', 
          smsPending: false 
        });
        return false;
      }
    } catch (error) {
      console.error('SMS verify error:', error);
      set({ 
        smsError: 'Ошибка сети. Попробуйте ещё раз.', 
        smsPending: false 
      });
      return false;
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

  logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    set({
      user: null,
      status: 'need_auth',
      favorites: [],
      favoriteIds: new Set(),
      smsStep: 'phone',
      smsError: undefined
    });
  },

  isAuthenticated() {
    const { user, status } = get();
    return !!user && (status === 'ready' || status === 'guest');
  },

  setCityCode(cityCode: string) {
    set({ cityCode });
  },

  async refreshFavorites(userLat?: number, userLng?: number) {
    const user = get().user;
    const telegramId = user?.telegramId;
    const userId = user?.id;
    
    if (!telegramId && !userId) {
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
    const user = get().user;
    const telegramId = user?.telegramId;
    const userId = user?.id;
    
    if (!telegramId && !userId) {
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

export function useIsAuthenticated() {
  const user = useUserStore((state) => state.user);
  const status = useUserStore((state) => state.status);
  return !!user && (status === 'ready' || status === 'guest');
}
