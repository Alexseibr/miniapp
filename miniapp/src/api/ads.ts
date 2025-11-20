import http from './http';
import { Ad, AdPreview, AdsResponse } from '@/types';

export interface ListAdsParams {
  categoryId?: string;
  subcategoryId?: string;
  seasonCode?: string;
  q?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export async function listAds(params: ListAdsParams = {}): Promise<AdsResponse> {
  const response = await http.get('/api/ads', { params });
  return response.data;
}

export async function getAd(id: string): Promise<Ad> {
  const response = await http.get(`/api/ads/${id}`);
  return response.data;
}

export async function listNearbyAds(params: ListAdsParams): Promise<AdsResponse> {
  const response = await http.get('/api/ads/nearby', { params });
  return response.data;
}

export async function listSeasonAds(code: string, params: Record<string, unknown> = {}) {
  const response = await http.get(`/api/seasons/${code}/ads`, { params });
  return response.data;
}
