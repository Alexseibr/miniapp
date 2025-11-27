import apiClient from './apiClient';
import { ApiResponse, PaginatedResponse } from '../types';

export interface GeoArea {
  id: string;
  name: string;
  type?: string;
  center?: {
    lat: number;
    lng: number;
  };
}

export interface GeoSearchParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  maxDistanceKm?: number;
  page?: number;
  limit?: number;
}

export const geoApi = {
  // TODO: заменить на реальные GEO endpoints из docs/GEO_API_DOCUMENTATION.md, когда файл появится
  reverseGeocode: (params: { lat: number; lng: number }) =>
    apiClient.get<ApiResponse<GeoArea>>('/geo/reverse', { params }),

  listRegions: () => apiClient.get<ApiResponse<GeoArea[]>>('/geo/regions'),
  listCities: (regionId?: string) => apiClient.get<ApiResponse<GeoArea[]>>('/geo/cities', { params: { regionId } }),
  searchNearby: (params: GeoSearchParams) =>
    apiClient.get<ApiResponse<PaginatedResponse<GeoArea>>>('/geo/search', { params })
};
