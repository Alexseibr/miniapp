import http from '@/api/http';
import type { NearbyAd } from '@/types';

export interface NearbyAdsRequest {
  lat: number;
  lng: number;
  radiusKm?: number;
  categoryId?: string;
  subcategoryId?: string;
  season?: string;
}

export async function fetchNearbyAds(params: NearbyAdsRequest): Promise<NearbyAd[]> {
  const { lat, lng, radiusKm = 5, categoryId, subcategoryId, season } = params;
  const response = await http.get('/api/ads/nearby', {
    params: {
      lat,
      lng,
      radiusKm,
      ...(categoryId ? { categoryId } : {}),
      ...(subcategoryId ? { subcategoryId } : {}),
      ...(season ? { season } : {}),
    },
  });

  const data = response.data;
  if (Array.isArray(data)) {
    return data as NearbyAd[];
  }

  return (data?.items as NearbyAd[]) || [];
}
