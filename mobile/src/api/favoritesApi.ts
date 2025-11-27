import apiClient from './apiClient';
import { AdPreview, ApiResponse, PaginatedResponse } from '../types';

export const favoritesApi = {
  list: () => apiClient.get<ApiResponse<PaginatedResponse<AdPreview>>>('/favorites'),
  add: (adId: string) => apiClient.post<ApiResponse<null>>(`/favorites/${adId}`),
  remove: (adId: string) => apiClient.delete<ApiResponse<null>>(`/favorites/${adId}`)
};
