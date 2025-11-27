import create from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, AuthTokens, MeResponse } from '../api/authApi';

interface AuthState {
  accessToken: string | null;
  user: MeResponse | null;
  loading: boolean;
  requestPhoneCode: (phone: string) => Promise<void>;
  verifyCode: (phone: string, code: string) => Promise<void>;
  fetchMe: () => Promise<void>;
  logout: () => void;
  initFromStorage: () => Promise<void>;
}

let accessTokenCache: string | null = null;
export const getAccessToken = () => accessTokenCache;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      loading: false,

      requestPhoneCode: async (phone: string) => {
        set({ loading: true });
        try {
          await authApi.requestPhoneCode({ phone });
        } finally {
          set({ loading: false });
        }
      },

      verifyCode: async (phone: string, code: string) => {
        set({ loading: true });
        try {
          const res = await authApi.verifyCode({ phone, code });
          const tokens: AuthTokens = res.data as AuthTokens;
          accessTokenCache = tokens.accessToken;
          set({ accessToken: tokens.accessToken });
          await get().fetchMe();
        } finally {
          set({ loading: false });
        }
      },

      fetchMe: async () => {
        if (!get().accessToken) return;
        try {
          const res = await authApi.me();
          set({ user: res.data });
        } catch (e) {
          console.warn('fetchMe error', e);
        }
      },

      logout: () => {
        accessTokenCache = null;
        set({ accessToken: null, user: null });
      },

      initFromStorage: async () => {
        const json = await AsyncStorage.getItem('auth-store');
        if (json) {
          try {
            const data = JSON.parse(json);
            const state = data.state as { accessToken?: string };
            if (state?.accessToken) {
              accessTokenCache = state.accessToken;
            }
          } catch (e) {
            console.warn('initFromStorage parse error', e);
          }
        }
        if (accessTokenCache) {
          await get().fetchMe();
        }
      },
    }),
    {
      name: 'auth-store',
      getStorage: () => AsyncStorage,
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
    }
  )
);
