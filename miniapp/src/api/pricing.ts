import api from './client';

export interface PriceEstimateRequest {
  categoryId: string;
  subcategoryId?: string;
  price: number;
  brand?: string;
  model?: string;
  storageGb?: number;
  ramGb?: number;
  carMake?: string;
  carModel?: string;
  carYear?: number;
  carEngineVolume?: number;
  carTransmission?: string;
  realtyType?: string;
  realtyRooms?: number;
  realtyAreaTotal?: number;
  realtyCity?: string;
  realtyDistrict?: string;
  city?: string;
}

export interface PriceLabels {
  marketLevel: 'below' | 'fair' | 'above' | 'unknown';
  messageForSeller: string;
  recommendedPriceRange?: {
    from: number;
    to: number;
  } | null;
}

export interface PriceEstimateResponse {
  hasMarketData: boolean;
  windowDays?: number;
  count?: number;
  avgPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  medianPrice?: number;
  avgPricePerSqm?: number;
  diffPercent?: number;
  labels?: PriceLabels;
  error?: string;
}

export interface PriceBriefResponse {
  adId: string;
  hasMarketData: boolean;
  diffPercent: number | null;
  marketLevel: 'below' | 'fair' | 'above' | 'unknown';
  avgPrice: number | null;
}

export async function estimatePrice(data: PriceEstimateRequest): Promise<PriceEstimateResponse> {
  const response = await api.post('/api/pricing/estimate', data);
  return response.data;
}

export async function getPriceBrief(adId: string): Promise<PriceBriefResponse> {
  const response = await api.get(`/api/pricing/brief/${adId}`);
  return response.data;
}

export async function getPriceBriefBatch(adIds: string[]): Promise<{ items: PriceBriefResponse[] }> {
  const response = await api.post('/api/pricing/brief/batch', { adIds });
  return response.data;
}

export async function getMarketDataForAd(adId: string): Promise<PriceEstimateResponse> {
  const response = await api.get(`/api/pricing/ad/${adId}/market`);
  return response.data;
}
