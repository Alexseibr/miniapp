import http from './http';
import { Ad } from '@/types';

export interface DraftProductPayload {
  title: string;
  description?: string;
  categoryId: string;
  subcategoryId?: string;
  photos?: string[];
  measureUnit?: string;
}

export async function createDraftProduct(payload: DraftProductPayload, token?: string): Promise<{ ad: Ad }> {
  const response = await http.post('/api/my-shop/products/draft', payload, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return response.data;
}

export async function updateProductPricing(
  productId: string,
  payload: { price?: number; stockQuantity?: number; measureUnit?: string },
  token?: string,
): Promise<{ ad: Ad }> {
  const response = await http.patch(`/api/my-shop/products/${productId}/pricing`, payload, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return response.data;
}

export async function publishProduct(productId: string, measureUnit?: string, token?: string): Promise<{ ad: Ad }> {
  const response = await http.post(`/api/my-shop/products/${productId}/publish`, { measureUnit }, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return response.data;
}

export async function pauseProduct(productId: string, token?: string): Promise<{ ad: Ad }> {
  const response = await http.post(`/api/my-shop/products/${productId}/pause`, undefined, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return response.data;
}

export async function updateBaseLocation(payload: { lat: number; lng: number; address?: string }, token?: string) {
  const response = await http.put('/api/seller-profile/my/base-location', payload, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return response.data;
}
