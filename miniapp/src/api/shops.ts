import http from './http';
import type { Shop } from '@/types';

export function getMyShop() {
  return http.get<Shop>('/me/shop');
}
