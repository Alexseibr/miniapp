import { httpClient } from './httpClient';
import type { LayoutResponse } from '../types/layout';

export const fetchLayout = async (
  cityCode: string,
  screen: string,
  variant?: string,
): Promise<LayoutResponse> => {
  const params = { cityCode, screen, variant };
  const { data } = await httpClient.get<LayoutResponse>('/layout', { params });
  return data;
};
