import http from './http';
import { Ad, AdPreview, AdsResponse, NearbyStatsResponse } from '@/types';

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
  brands?: string;
  signal?: AbortSignal;
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
  const { signal, ...queryParams } = params;
  const response = await http.get('/api/ads/nearby', { 
    params: queryParams,
    signal 
  });
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
  publishAt?: string;
  isFreeGiveaway?: boolean;
  giveawaySubcategoryId?: string;
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

export interface NearbyStatsParams {
  lat: number;
  lng: number;
  radiusKm: number;
  signal?: AbortSignal;
}

export async function getNearbyStats(params: NearbyStatsParams): Promise<NearbyStatsResponse> {
  const { signal, ...queryParams } = params;
  const response = await http.get('/api/ads/nearby-stats', { 
    params: queryParams,
    signal 
  });
  return response.data;
}

// ========== Analytics Tracking ==========

const trackedImpressions = new Set<string>();

export async function trackImpression(adId: string): Promise<void> {
  if (trackedImpressions.has(adId)) return;
  trackedImpressions.add(adId);
  
  try {
    await http.post(`/api/ads/${adId}/track-impression`);
  } catch (error) {
    console.warn('[trackImpression]', error);
  }
}

export async function trackView(adId: string): Promise<void> {
  try {
    await http.post(`/api/ads/${adId}/track-view`);
  } catch (error) {
    console.warn('[trackView]', error);
  }
}

export async function trackContact(adId: string): Promise<void> {
  try {
    await http.post(`/api/ads/${adId}/track-contact`);
  } catch (error) {
    console.warn('[trackContact]', error);
  }
}

export async function trackContactReveal(adId: string): Promise<{ success: boolean; contactRevealCount?: number }> {
  try {
    const response = await http.post(`/api/ads/${adId}/contact-reveal`);
    return response.data;
  } catch (error) {
    console.warn('[trackContactReveal]', error);
    return { success: false };
  }
}
