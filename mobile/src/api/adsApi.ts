import { httpClient } from './httpClient';
import type { Ad } from '../types/ad';

export const fetchTrendingAds = async (cityCode?: string): Promise<Ad[]> => {
  const params = cityCode ? { cityCode } : undefined;
  const { data } = await httpClient.get<Ad[]>('/ads/trending', { params });
  return data;
};

export const fetchNearbyAds = async (
  lat: number,
  lng: number,
  radiusKm: number,
  categoryId?: string,
): Promise<Ad[]> => {
  const params = { lat, lng, radiusKm, categoryId };
  const { data } = await httpClient.get<Ad[]>('/ads/nearby', { params });
  return data;
};

export const fetchSeasonAds = async (seasonCode: string): Promise<Ad[]> => {
  const params = { seasonCode };
  const { data } = await httpClient.get<Ad[]>('/ads', { params });
  return data;
};
