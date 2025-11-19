import http from './http';
import { CartItem, OrderSummary } from '@/types';

export interface SubmitOrderPayload {
  buyerTelegramId: number;
  comment?: string;
  seasonCode?: string;
  items: { adId: string; quantity: number }[];
}

export async function submitOrder(payload: SubmitOrderPayload) {
  const response = await http.post('/api/orders', payload);
  return response.data;
}

export async function fetchOrders(buyerTelegramId: number) {
  const response = await http.get('/api/orders/my', {
    params: { buyerTelegramId },
  });
  return response.data as { items?: OrderSummary[] };
}

export function mapCartToPayload(items: CartItem[]): SubmitOrderPayload['items'] {
  return items.map((item) => ({ adId: item.adId, quantity: item.quantity }));
}
