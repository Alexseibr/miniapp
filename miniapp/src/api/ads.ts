import http from './http';
import { Ad, AdPreview, AdsResponse } from '@/types';

export interface ListAdsParams {
  categoryId?: string;
  subcategoryId?: string;
  categoryCode?: string;
  subcategoryCode?: string;
  seasonCode?: string;
  q?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  priceMin?: number;
  priceMax?: number;
  [key: string]: unknown;
}

export interface NearbyAdsParams {
  lat: number;
  lng: number;
  radiusKm: number;
  limit?: number;
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

export async function getNearbyAds(params: NearbyAdsParams): Promise<AdsResponse> {
  const query = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    radiusKm: String(params.radiusKm),
    ...(params.limit ? { limit: String(params.limit) } : {}),
  });

  const response = await fetch(`/api/ads/nearby?${query.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch nearby ads');
  }
  return response.json();
}

export async function listSeasonAds(code: string, params: Record<string, unknown> = {}) {
  const response = await http.get(`/api/seasons/${code}/ads`, { params });
  return response.data;
}

export async function listCraftNearby(params: NearbyAdsParams): Promise<AdsResponse> {
  const response = await http.get('/api/ads/craft', { params });
  return response.data;
}

export async function listLiveSpots(params: NearbyAdsParams & { seasonCode?: string }): Promise<AdsResponse> {
  const response = await http.get('/api/ads/live-spots', { params });
  return response.data;
}
