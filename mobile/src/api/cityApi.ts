import { httpClient } from './httpClient';
import type { CityConfig } from '../types/city';

export const fetchCityConfig = async (code: string): Promise<CityConfig> => {
  const { data } = await httpClient.get<CityConfig>(`/city/${code}`);
  return data;
};
