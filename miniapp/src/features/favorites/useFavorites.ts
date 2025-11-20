import { useEffect } from 'react';
import { create } from 'zustand';

const STORAGE_KEY = 'ketmar_favorites';

function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to parse favorites from storage', error);
    return [];
  }
}

function persistFavorites(favorites: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error('Failed to save favorites', error);
  }
}

interface FavoritesState {
  favorites: string[];
  hydrate: () => void;
  toggleFavorite: (adId: string) => void;
  isFavorite: (adId: string) => boolean;
}

const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  hydrate() {
    set({ favorites: readFavorites() });
  },
  toggleFavorite(adId) {
    set((state) => {
      const exists = state.favorites.includes(adId);
      const updated = exists ? state.favorites.filter((id) => id !== adId) : [...state.favorites, adId];
      persistFavorites(updated);
      return { favorites: updated };
    });
  },
  isFavorite(adId) {
    return get().favorites.includes(adId);
  },
}));

export function useFavorites() {
  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const isFavorite = useFavoritesStore((state) => state.isFavorite);

  useEffect(() => {
    useFavoritesStore.getState().hydrate();
  }, []);

  return { favorites, toggleFavorite, isFavorite };
}
