import http from './http';
import { FavoriteItem } from '@/types';

export async function fetchFavorites(telegramId: number) {
  if (!telegramId) {
    return { items: [], count: 0 };
  }
  // Сервер получает telegramId из headers (X-Telegram-Init-Data)
  const response = await http.get('/api/favorites/my');
  return response.data as { items: FavoriteItem[]; count?: number };
}

export async function addFavorite(telegramId: number, adId: string) {
  // POST /api/favorites - добавить в избранное
  const response = await http.post('/api/favorites', { adId });
  return response.data;
}

export async function removeFavorite(telegramId: number, adId: string) {
  // DELETE /api/favorites/:adId - удалить из избранного
  const response = await http.delete(`/api/favorites/${adId}`);
  return response.data as { ok: boolean };
}

export async function toggleFavorite(telegramId: number, adId: string, isFavorite: boolean) {
  // isFavorite = true значит нужно удалить, false - добавить
  if (isFavorite) {
    return removeFavorite(telegramId, adId);
  } else {
    return addFavorite(telegramId, adId);
  }
}
