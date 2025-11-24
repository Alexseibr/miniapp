import { httpClient } from './httpClient';
import { Ad } from './adsApi';

export const favoritesApi = {
  getMyFavorites: () => httpClient.get<Ad[]>('/favorites/my'),
  addToFavorites: (adId: string) => httpClient.post(`/favorites/${adId}`),
  removeFromFavorites: (adId: string) => httpClient.delete(`/favorites/${adId}`)
};
