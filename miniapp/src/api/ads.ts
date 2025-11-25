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
  minPrice?: number;
  maxPrice?: number;
}

export interface NearbyAdsParams {
  lat: number;
  lng: number;
  radiusKm: number;
  limit?: number;
}

export async function listAds(params: ListAdsParams = {}): Promise<AdsResponse> {
  const response = await http.get('/api/ads/search', { params });
  return response.data;
}

export async function getAd(id: string, params?: { lat?: number; lng?: number }): Promise<Ad> {
  const response = await http.get(`/api/ads/${id}`, { params });
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

export interface CreateAdPayload {
  title: string;
  description?: string;
  categoryId: string;
  subcategoryId: string;
  price: number;
  currency?: string;
  photos?: string[];
  sellerTelegramId: number;
  city?: string;
  geoLabel?: string;
  contactType?: 'telegram_phone' | 'telegram_username' | 'instagram' | 'none';
  contactPhone?: string;
  contactUsername?: string;
  contactInstagram?: string;
  deliveryType?: 'pickup_only' | 'delivery_only' | 'delivery_and_pickup';
  deliveryRadiusKm?: number;
  location?: {
    lat: number;
    lng: number;
    geo?: {
      type: 'Point';
      coordinates: [number, number];
    };
  };
}

export async function fetchMyAds(sellerTelegramId: number) {
  if (!sellerTelegramId) {
    return { items: [] };
  }
  const response = await http.get('/api/ads/my', {
    params: { sellerTelegramId },
  });
  return response.data as { items: Ad[] };
}

export async function createAd(payload: CreateAdPayload) {
  const response = await http.post('/api/ads', payload);
  return response.data as Ad;
}

export async function getSimilarAds(adId: string, subcategoryId: string, limit: number = 6): Promise<AdsResponse> {
  const response = await http.get('/api/ads/search', {
    params: {
      subcategoryId,
      limit,
      sort: 'createdAt_desc'
    }
  });
  const items = (response.data.items || []).filter((item: AdPreview) => item._id !== adId);
  return {
    ...response.data,
    items: items.slice(0, limit)
  };
}
