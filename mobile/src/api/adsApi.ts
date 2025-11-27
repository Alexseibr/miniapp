import apiClient from './apiClient';
import { AdDetails, AdPreview, ApiResponse, CreateAdPayload, PaginatedResponse } from '../types';

export interface ListAdsParams {
  categoryId?: string;
  subcategoryId?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  region?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export const adsApi = {
  list: (params?: ListAdsParams) =>
    apiClient.get<ApiResponse<PaginatedResponse<AdPreview>>>('/ads', { params }),

  search: (params?: ListAdsParams & { maxDistanceKm?: number }) =>
    apiClient.get<ApiResponse<PaginatedResponse<AdPreview>>>('/ads/search', { params }),

  nearby: (params: { lat: number; lng: number; radiusKm?: number; page?: number; limit?: number }) =>
    apiClient.get<ApiResponse<PaginatedResponse<AdPreview>>>('/ads/nearby', { params }),

  liveSpots: (params: { lat: number; lng: number; radiusKm?: number }) =>
    apiClient.get<ApiResponse<PaginatedResponse<AdPreview>>>('/ads/live-spots', { params }),

  getById: (id: string) => apiClient.get<ApiResponse<AdDetails>>(`/ads/${id}`),

  create: (payload: CreateAdPayload) => apiClient.post<ApiResponse<AdDetails>>('/ads', payload),

  update: (id: string, payload: Partial<CreateAdPayload>) =>
    apiClient.patch<ApiResponse<AdDetails>>(`/ads/${id}`, payload),

  delete: (id: string) => apiClient.delete<ApiResponse<null>>(`/ads/${id}`)
};
