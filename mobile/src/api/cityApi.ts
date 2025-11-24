import apiClient from './client';
import type { CityConfig } from '../types/city';

export const fetchCityConfig = async (cityCode: string): Promise<CityConfig> => {
  const response = await apiClient.get<CityConfig>(`/api/city/${cityCode}`);
  return response.data;
};
