import { create } from 'zustand';
import { requestLocation } from '@/utils/telegram';
import type { LocationData } from '@/types/telegram';

interface LocationStore {
  userLocation: { lat: number; lng: number } | null;
  isRequesting: boolean;
  error: string | null;
  maxDistanceKm: number | null;
  
  setUserLocation: (lat: number, lng: number) => void;
  setMaxDistance: (distanceKm: number | null) => void;
  requestUserLocation: () => Promise<boolean>;
  clearLocation: () => void;
}

export const useLocationStore = create<LocationStore>((set) => ({
  userLocation: null,
  isRequesting: false,
  error: null,
  maxDistanceKm: null,

  setUserLocation: (lat, lng) => {
    set({ userLocation: { lat, lng }, error: null });
  },

  setMaxDistance: (distanceKm) => {
    set({ maxDistanceKm: distanceKm });
  },

  requestUserLocation: async () => {
    set({ isRequesting: true, error: null });
    
    try {
      const location: LocationData | null = await requestLocation();
      
      if (location && location.latitude && location.longitude) {
        set({
          userLocation: {
            lat: location.latitude,
            lng: location.longitude,
          },
          isRequesting: false,
          error: null,
        });
        return true;
      } else {
        set({
          isRequesting: false,
          error: 'Не удалось получить геолокацию',
        });
        return false;
      }
    } catch (error) {
      console.error('Location request error:', error);
      set({
        isRequesting: false,
        error: 'Ошибка при запросе геолокации',
      });
      return false;
    }
  },

  clearLocation: () => {
    set({ userLocation: null, maxDistanceKm: null, error: null });
  },
}));
