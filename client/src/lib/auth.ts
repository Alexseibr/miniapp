export const AUTH_TOKEN_KEY = "authToken";

export function getAuthToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (typeof window !== 'undefined') {
    const telegramInitData = (window as any)?.Telegram?.WebApp?.initData;
    if (telegramInitData) {
      headers['X-Telegram-InitData'] = telegramInitData;
    }
  }

  return headers;
}

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers: HeadersInit = {
    ...(init.headers || {}),
    ...getAuthHeaders(),
  };

  return fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  });
}
