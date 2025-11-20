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

export const listAds = getAds;

type NearbyParams = { lat: number; lng: number; radius?: number } & Record<string, unknown>;

export const getNearbyAds = (
  coordsOrLat: number | NearbyParams,
  lng?: number,
  radius?: number,
) => {
  const { lat, lng: lngValue, radius: radiusValue, ...rest } =
    typeof coordsOrLat === 'number'
      ? ({ lat: coordsOrLat, lng: lng as number, radius: radius } satisfies NearbyParams)
      : coordsOrLat;

  return api
    .get('/ads/nearby', { params: { lat, lng: lngValue, radiusKm: radiusValue, ...rest } })
    .then((res) => res.data);
};

export const listNearbyAds = getNearbyAds;

export const getAdById = (id: string) => api.get(`/ads/${id}`).then((res) => res.data);
export const getAd = getAdById;

export const createAd = (payload: AdPayload) => api.post('/ads', payload).then((res) => res.data);

export const updatePrice = (id: string, price: number) =>
  api.put(`/ads/${id}/price`, { price }).then((res) => res.data);

export const updateStatus = (id: string, status: string) =>
  api.put(`/ads/${id}/status`, { status }).then((res) => res.data);
