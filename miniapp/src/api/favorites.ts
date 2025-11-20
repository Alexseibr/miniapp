import http from './http';
import { FavoriteItem } from '@/types';

export async function fetchFavorites(telegramId: number) {
  if (!telegramId) {
    return { items: [], count: 0 };
  }
  const response = await http.get('/api/favorites/my', {
    params: { telegramId },
  });
  return response.data as { items: FavoriteItem[]; count?: number };
}

export async function addFavorite(telegramId: number, adId: string) {
  const response = await http.post('/api/favorites/add', { telegramId, adId });
  return response.data as { ok: boolean; items: FavoriteItem[] };
}

export async function removeFavorite(telegramId: number, adId: string) {
  const response = await http.delete(`/api/favorites/${adId}`, {
    data: { telegramId },
  });
  return response.data as { ok: boolean; items: FavoriteItem[] };
}
