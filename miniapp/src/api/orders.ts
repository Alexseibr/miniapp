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

export interface CreateShopOrderPayload {
  adId: string;
  quantity?: number;
  deliveryRequired?: boolean;
  deliveryAddress?: string;
  deliveryLocation?: { lat: number; lng: number };
  scheduledDate?: string;
  buyerTelegramId: number;
  buyerName: string;
  buyerPhone: string;
}

export interface ShopOrder {
  _id: string;
  adId: string;
  sellerId?: string;
  sellerTelegramId?: number;
  shopProfileId?: string;
  buyerId?: string;
  buyerTelegramId: number;
  buyerName?: string;
  buyerUsername?: string;
  buyerPhone?: string;
  items: {
    adId: string;
    title: string;
    quantity: number;
    price: number;
    currency?: string;
    sellerTelegramId: number;
  }[];
  totalPrice: number;
  status: 'new' | 'confirmed' | 'delivering' | 'completed' | 'cancelled';
  deliveryRequired: boolean;
  deliveryAddress?: string;
  deliveryLocation?: { lat: number; lng: number };
  scheduledDate?: string;
  createdAt?: string;
  updatedAt?: string;
  distanceKmFromPrev?: number;
}

export type DateFilter = 'today' | 'tomorrow' | 'future';

export async function createShopOrder(payload: CreateShopOrderPayload): Promise<{ success: boolean; order: ShopOrder }> {
  const response = await http.post('/api/shop/orders', payload);
  return response.data;
}

export async function fetchShopOrders(dateFilter: DateFilter = 'today', sellerTelegramId?: number): Promise<{ items: ShopOrder[] }> {
  const response = await http.get('/api/shop/orders', {
    params: { date: dateFilter, sellerTelegramId },
  });
  return response.data;
}

export async function fetchDeliveryRoutePlan(dateFilter: DateFilter = 'today', sellerTelegramId?: number): Promise<{ items: ShopOrder[] }> {
  const response = await http.get('/api/shop/orders/route-plan', {
    params: { date: dateFilter, sellerTelegramId },
  });
  return response.data;
}

export async function fetchFarmerRoutePlan(
  date: string,
  startLat?: number,
  startLng?: number
): Promise<{ items: ShopOrder[] }> {
  const response = await http.get('/api/farmer/orders/route-plan', {
    params: { date, startLat, startLng },
  });
  return response.data;
}
