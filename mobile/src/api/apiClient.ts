import axios from 'axios';
import Constants from 'expo-constants';
import { storage } from '../services/storage';
import { useAuthStore } from '../store/authStore';

const fallbackBaseUrl = 'https://your-domain.com/api';
const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ||
  fallbackBaseUrl;

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use(async (config) => {
  const tokenFromStore = useAuthStore.getState().accessToken;
  const token = tokenFromStore || (await storage.getAccessToken());
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`
    };
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // TODO: optional refresh flow using /api/mobile/v1/auth/refresh when backend is ready
      await storage.clearTokens();
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
