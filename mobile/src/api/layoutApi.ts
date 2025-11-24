import apiClient from './client';
import type { LayoutResponse } from '../types/layout';

export const fetchLayout = async (cityCode: string, screen: string): Promise<LayoutResponse> => {
  const response = await apiClient.get<LayoutResponse>('/api/layout', {
    params: { cityCode, screen },
  });
  return response.data;
};
