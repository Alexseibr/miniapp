import api from './axios';

export interface AdPayload {
  title: string;
  description: string;
  price: number;
  category: string;
  subcategory?: string;
  seasonCode?: string;
  photos?: string[];
  lat: number;
  lng: number;
}

export const getAds = (filters: Record<string, string | number | undefined>) =>
  api.get('/ads', { params: filters }).then((res) => res.data);

export const getNearbyAds = (lat: number, lng: number, radius?: number) =>
  api
    .get('/ads/nearby', { params: { lat, lng, radiusKm: radius } })
    .then((res) => res.data);

export const getAdById = (id: string) => api.get(`/ads/${id}`).then((res) => res.data);

export const createAd = (payload: AdPayload) => api.post('/ads', payload).then((res) => res.data);

export const updatePrice = (id: string, price: number) =>
  api.put(`/ads/${id}/price`, { price }).then((res) => res.data);

export const updateStatus = (id: string, status: string) =>
  api.put(`/ads/${id}/status`, { status }).then((res) => res.data);
