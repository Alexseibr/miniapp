import { create } from 'zustand';
import { CartItem } from '@/types';

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (adId: string) => void;
  updateQuantity: (adId: string, quantity: number) => void;
  clear: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (item) => {
    set((state) => {
      const existing = state.items.find((entry) => entry.adId === item.adId);
      if (existing) {
        return {
          items: state.items.map((entry) =>
            entry.adId === item.adId
              ? { ...entry, quantity: entry.quantity + item.quantity }
              : entry
          ),
        };
      }
      return { items: [...state.items, item] };
    });
  },
  removeItem: (adId) => {
    set((state) => ({ items: state.items.filter((item) => item.adId !== adId) }));
  },
  updateQuantity: (adId, quantity) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.adId === adId ? { ...item, quantity: Math.max(1, quantity) } : item
      ),
    }));
  },
  clear: () => set({ items: [] }),
  total: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
}));
