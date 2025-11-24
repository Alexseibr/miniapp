import apiClient from './client';
import type { Ad } from '../types/ad';

export const fetchTrendingAds = async (cityCode?: string): Promise<Ad[]> => {
  const response = await apiClient.get<Ad[]>('/api/ads/trending', {
    params: { cityCode },
  });
  return response.data;
};

export const fetchNearbyAds = async (
  lat: number,
  lng: number,
  radiusKm?: number,
  categoryId?: string
): Promise<Ad[]> => {
  const response = await apiClient.get<Ad[]>('/api/ads/nearby', {
    params: { lat, lng, radiusKm, categoryId },
  });
  return response.data;
};

export const fetchSeasonAds = async (seasonCode: string): Promise<Ad[]> => {
  const response = await apiClient.get<Ad[]>('/api/ads', {
    params: { seasonCode },
  });
  return response.data;
};
