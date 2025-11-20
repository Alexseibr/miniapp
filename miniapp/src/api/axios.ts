import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const tg = (window as any).Telegram?.WebApp;
  const initData = tg?.initData || '';
  if (initData) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>)['X-Telegram-InitData'] = initData;
  }
  return config;
});

export default api;
