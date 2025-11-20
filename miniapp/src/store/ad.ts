import { create } from 'zustand';
import { getAds, getNearbyAds } from '../api/ads';

interface AdState {
  ads: any[];
  nearby: any[];
  loading: boolean;
  loadAds: (filters?: Record<string, any>) => Promise<void>;
  loadNearby: (lat: number, lng: number, radius?: number) => Promise<void>;
}

export const useAdStore = create<AdState>((set) => ({
  ads: [],
  nearby: [],
  loading: false,
  loadAds: async (filters = {}) => {
    set({ loading: true });
    try {
      const data = await getAds(filters);
      set({ ads: data, loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
    }
  },
  loadNearby: async (lat, lng, radius) => {
    set({ loading: true });
    try {
      const data = await getNearbyAds(lat, lng, radius);
      set({ nearby: data, loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
    }
  },
}));
