import { create } from 'zustand';
import { adsApi, ListAdsParams } from '../api/adsApi';
import { AdPreview, PaginatedResponse } from '../types';

interface AdsState {
  items: AdPreview[];
  loading: boolean;
  error: string | null;
  fetchAds: (params?: ListAdsParams) => Promise<PaginatedResponse<AdPreview> | null>;
}

export const useAdsStore = create<AdsState>((set) => ({
  items: [],
  loading: false,
  error: null,
  async fetchAds(params) {
    set({ loading: true, error: null });
    try {
      const response = await adsApi.search(params);
      const data = response.data.data;
      if (data) {
        set({ items: data.items, loading: false });
        return data;
      }
    } catch (error) {
      set({ error: 'Не удалось загрузить объявления', loading: false });
    }
    return null;
  }
}));
