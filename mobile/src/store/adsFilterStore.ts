import { create } from 'zustand';
import { CategoryNode } from '../api/categoriesApi';

export type SellerRole = 'user' | 'farmer' | 'shop' | 'other' | null;

export interface AdsFilterState {
  category: CategoryNode | null;
  minPrice: number | null;
  maxPrice: number | null;
  seasonCode: string | null;
  sellerRole: SellerRole;

  setCategory: (cat: CategoryNode | null) => void;
  setMinPrice: (value: number | null) => void;
  setMaxPrice: (value: number | null) => void;
  setSeasonCode: (value: string | null) => void;
  setSellerRole: (value: SellerRole) => void;
  reset: () => void;
}

export const useAdsFilterStore = create<AdsFilterState>((set) => ({
  category: null,
  minPrice: null,
  maxPrice: null,
  seasonCode: null,
  sellerRole: null,

  setCategory: (category) => set({ category }),
  setMinPrice: (minPrice) => set({ minPrice }),
  setMaxPrice: (maxPrice) => set({ maxPrice }),
  setSeasonCode: (seasonCode) => set({ seasonCode: seasonCode || null }),
  setSellerRole: (sellerRole) => set({ sellerRole }),

  reset: () =>
    set({
      category: null,
      minPrice: null,
      maxPrice: null,
      seasonCode: null,
      sellerRole: null,
    }),
}));
