import { httpClient } from './httpClient';

export interface AdPayload {
  title: string;
  description: string;
  price: number;
  categoryId: string;
  cityCode: string;
  photos?: string[];
  locationHint?: string;
}

export interface Ad {
  _id: string;
  title: string;
  description: string;
  price: number;
  cityCode: string;
  photos: string[];
  status?: string;
  contact?: {
    phone?: string;
    username?: string;
  };
}

export const adsApi = {
  getMyAds: (status?: string) => httpClient.get<Ad[]>(`/ads/my`, { params: { status } }),
  createAd: (payload: AdPayload) => httpClient.post<Ad>('/ads', payload),
  getAdById: (id: string) => httpClient.get<Ad>(`/ads/${id}`)
};
