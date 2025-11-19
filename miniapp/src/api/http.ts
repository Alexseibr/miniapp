import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '';

const http = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let sessionToken: string | null = null;

export function setSessionToken(token: string | null) {
  sessionToken = token;
}

http.interceptors.request.use((config) => {
  const initData = window.Telegram?.WebApp?.initData;
  if (initData) {
    config.headers = config.headers || {};
    config.headers['X-Telegram-Init-Data'] = initData;
  }
  if (sessionToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${sessionToken}`;
  }
  return config;
});

export default http;
