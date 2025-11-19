import http, { setSessionToken } from './http';
import { FavoriteItem, TelegramProfile, UserProfile } from '@/types';

export interface AuthResponse {
  ok: boolean;
  token?: string;
  user?: UserProfile;
  telegram?: TelegramProfile;
  favorites?: FavoriteItem[];
}

export async function validateSession(initData?: string): Promise<AuthResponse> {
  const response = await http.post('/auth/telegram', null, {
    headers: initData
      ? {
          'X-Telegram-Init-Data': initData,
        }
      : undefined,
  });

  if (response.data?.token) {
    setSessionToken(response.data.token);
  }

  return response.data;
}
