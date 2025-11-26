import http from './http';
import { FavoriteItem } from '@/types';

interface FavoritesResponse {
  items: FavoriteItem[];
  count: number;
}

interface ToggleResponse {
  status: 'added' | 'removed';
  isFavorite: boolean;
  notifyOnPriceChange: boolean;
  notifyOnStatusChange: boolean;
}

interface CheckResponse {
  isFavorite: boolean;
  notifyOnPriceChange: boolean;
  notifyOnStatusChange: boolean;
}

export async function fetchFavorites(userLat?: number, userLng?: number): Promise<FavoritesResponse> {
  const params = new URLSearchParams();
  if (userLat) params.append('lat', String(userLat));
  if (userLng) params.append('lng', String(userLng));
  
  const url = params.toString() ? `/api/favorites/my?${params}` : '/api/favorites/my';
  const response = await http.get(url);
  return response.data as FavoritesResponse;
}

export async function toggleFavorite(adId: string): Promise<ToggleResponse> {
  const response = await http.post('/api/favorites/toggle', { adId });
  return response.data as ToggleResponse;
}

export async function addFavorite(adId: string): Promise<{ ok: boolean; status: string }> {
  const response = await http.post('/api/favorites', { adId });
  return response.data;
}

export async function removeFavorite(adId: string): Promise<{ ok: boolean }> {
  const response = await http.delete(`/api/favorites/${adId}`);
  return response.data as { ok: boolean };
}

export async function checkFavorite(adId: string): Promise<CheckResponse> {
  const response = await http.get(`/api/favorites/check/${adId}`);
  return response.data as CheckResponse;
}

export async function updateFavoriteSettings(
  adId: string,
  settings: { notifyOnPriceChange?: boolean; notifyOnStatusChange?: boolean }
): Promise<{ adId: string; notifyOnPriceChange: boolean; notifyOnStatusChange: boolean }> {
  const response = await http.patch(`/api/favorites/${adId}/settings`, settings);
  return response.data;
}
