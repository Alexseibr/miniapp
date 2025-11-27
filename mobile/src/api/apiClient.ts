import axios from 'axios';
import { getAccessToken } from '../store/authStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-domain.com/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
    return config;
  },
  (error) => Promise.reject(error)
);
