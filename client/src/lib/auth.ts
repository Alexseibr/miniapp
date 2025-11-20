export const AUTH_TOKEN_KEY = "authToken";

export function getAuthToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
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
