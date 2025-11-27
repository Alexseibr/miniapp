import { apiClient } from './apiClient';

export const favoritesApi = {
  list() {
    return apiClient.get('/favorites');
  },
  add(adId: string) {
    return apiClient.post(`/favorites/${adId}`);
  },
  remove(adId: string) {
    return apiClient.delete(`/favorites/${adId}`);
  },
};
