import { apiClient } from './apiClient';

export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'distance';

export interface AdsListParams {
  limit?: number;
  offset?: number;
  categoryId?: string;
  subcategoryId?: string;
  seasonCode?: string;
  status?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortOption;
}

export interface AdLocation {
  lat: number;
  lng: number;
  city?: string;
  area?: string;
  address?: string;
}

export interface AdListItem {
  _id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  categoryId: string;
  subcategoryId?: string;
  previewUrl?: string;
  photos?: string[];
  location?: AdLocation;
  distanceKm?: number;
}

export interface AdDetails extends AdListItem {
  // TODO: дополнить полями из API.md при углублении карточки
}

export interface AdsListResponse {
  items: AdListItem[];
  total: number;
}

export const adsApi = {
  listAds(params: AdsListParams) {
    return apiClient.get<AdsListResponse>('/ads', { params });
  },

  getAdById(id: string) {
    return apiClient.get<AdDetails>(`/ads/${id}`);
  },
};
