import http from './http';
import type {
  MyShopProduct,
  MyShopProductsResponse,
  MyShopProfile,
  MyShopStats,
} from '@/types/myShop';

export async function getMyShopProducts(status?: 'active' | 'draft' | 'expired') {
  const response = await http.get<MyShopProductsResponse>('/api/my-shop/products', {
    params: { status },
  });
  return response.data;
}

export async function getMyShopStats() {
  const response = await http.get<{ success: boolean; stats: MyShopStats }>('/api/my-shop/stats');
  return response.data;
}

export async function getMyShopProfile() {
  const response = await http.get<{ success: boolean; profile: MyShopProfile }>(
    '/api/my-shop/profile',
  );
  return response.data;
}

export async function updateMyShopProfile(payload: Partial<MyShopProfile>) {
  const response = await http.put<{ success: boolean; profile: MyShopProfile }>(
    '/api/my-shop/profile',
    payload,
  );
  return response.data;
}

export type { MyShopProduct, MyShopProfile, MyShopStats };
