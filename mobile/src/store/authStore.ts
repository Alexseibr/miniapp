import { create } from 'zustand';
import { authApi } from '../api/authApi';
import { storage } from '../services/storage';
import { AuthTokens, User } from '../types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  onboardingCompleted: boolean;
  setTokens: (tokens: AuthTokens) => Promise<void>;
  setUser: (user: User | null) => void;
  markOnboarding: () => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  fetchMe: () => Promise<User | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  onboardingCompleted: false,
  async setTokens(tokens) {
    set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken ?? null });
    await storage.setTokens(tokens);
  },
  setUser(user) {
    set({ user });
  },
  async markOnboarding() {
    await storage.setOnboardingCompleted();
    set({ onboardingCompleted: true });
  },
  async logout() {
    await storage.clearTokens();
    set({ accessToken: null, refreshToken: null, user: null });
  },
  async hydrate() {
    const [accessToken, refreshToken, onboardingCompleted] = await Promise.all([
      storage.getAccessToken(),
      storage.getRefreshToken(),
      storage.isOnboardingCompleted()
    ]);
    set({
      accessToken: accessToken,
      refreshToken: refreshToken,
      onboardingCompleted: onboardingCompleted ?? false
    });
    if (accessToken) {
      await get().fetchMe();
    }
  },
  async fetchMe() {
    try {
      const response = await authApi.me();
      const user = response.data.data;
      if (user) {
        set({ user });
        return user;
      }
    } catch (error) {
      // ignore fetch error; token may be invalid
    }
    return null;
  }
}));
