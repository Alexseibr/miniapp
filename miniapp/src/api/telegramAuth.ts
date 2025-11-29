import http, { setSessionToken } from './http';
import { FavoriteItem, TelegramProfile, UserProfile } from '@/types';

const AUTH_TOKEN_KEY = 'ketmar_auth_token';

export interface AuthResponse {
  ok: boolean;
  token?: string;
  user?: UserProfile;
  telegram?: TelegramProfile;
  favorites?: FavoriteItem[];
}

export async function validateSession(initData?: string, phone?: string): Promise<AuthResponse> {
  console.log('[TelegramAuth] validateSession called, initData:', initData ? 'present' : 'missing');
  
  const response = await http.post('/auth/telegram', 
    phone ? { phone } : {}, 
    {
      headers: initData
        ? {
            'X-Telegram-Init-Data': initData,
          }
        : undefined,
    }
  );

  console.log('[TelegramAuth] Response received:', {
    ok: response.data?.ok,
    hasToken: !!response.data?.token,
    tokenPreview: response.data?.token?.substring(0, 20) + '...',
    hasUser: !!response.data?.user,
  });

  if (response.data?.token) {
    console.log('[TelegramAuth] Saving token to localStorage...');
    setSessionToken(response.data.token);
    localStorage.setItem(AUTH_TOKEN_KEY, response.data.token);
    console.log('[TelegramAuth] Token saved! Verifying:', localStorage.getItem(AUTH_TOKEN_KEY)?.substring(0, 20) + '...');
  } else {
    console.warn('[TelegramAuth] No token in response!');
  }

  return response.data;
}
