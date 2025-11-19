import http from './http';
import { SeasonInfo } from '@/types';

export async function fetchSeasons() {
  const response = await http.get('/api/seasons');
  return response.data as SeasonInfo[];
}

export async function fetchSeasonAds(code: string, params: Record<string, unknown> = {}) {
  const response = await http.get(`/api/seasons/${code}/ads`, { params });
  return response.data;
}
