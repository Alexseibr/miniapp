import axios from 'axios';
import { authStore } from '../utils/authStore';

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api'
});

httpClient.interceptors.request.use((config) => {
  const token = authStore.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      authStore.logout();
    }
    return Promise.reject(error);
  }
);
