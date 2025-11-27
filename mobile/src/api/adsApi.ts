import { apiClient } from './apiClient';

// Пока заглушка для списка/деталей объявлений
export const adsApi = {
  listAds(params?: Record<string, unknown>) {
    return apiClient.get('/ads', { params });
  },
  getAd(id: string) {
    return apiClient.get(`/ads/${id}`);
  },
};
