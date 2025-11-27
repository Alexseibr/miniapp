import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthTokens } from '../types';

const ACCESS_TOKEN_KEY = 'ketmar_access_token';
const REFRESH_TOKEN_KEY = 'ketmar_refresh_token';
const ONBOARDING_KEY = 'ketmar_onboarding_done';

export const storage = {
  async setTokens(tokens: AuthTokens) {
    await AsyncStorage.multiSet([
      [ACCESS_TOKEN_KEY, tokens.accessToken],
      [REFRESH_TOKEN_KEY, tokens.refreshToken ?? '']
    ]);
  },
  async getAccessToken() {
    return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  },
  async getRefreshToken() {
    return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  },
  async clearTokens() {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
  },
  async setOnboardingCompleted() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  },
  async isOnboardingCompleted() {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  }
};
