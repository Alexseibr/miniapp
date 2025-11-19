import { create } from 'zustand';

interface GeoCoords {
  lat: number;
  lng: number;
}

interface GeoState {
  coords: GeoCoords | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  radiusKm: number;
  requestLocation: () => Promise<void>;
  setRadius: (value: number) => void;
}

const useGeoStore = create<GeoState>((set) => ({
  coords: null,
  status: 'idle',
  error: undefined,
  radiusKm: 5,
  async requestLocation() {
    set({ status: 'loading', error: undefined });
    if ('geolocation' in navigator) {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            set({
              coords: { lat: latitude, lng: longitude },
              status: 'ready',
            });
            resolve();
          },
          (error) => {
            set({ status: 'error', error: error.message || 'Геолокация недоступна' });
            resolve();
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });
      return;
    }
    set({ status: 'error', error: 'Геолокация не поддерживается' });
  },
  setRadius(value) {
    set({ radiusKm: value });
  },
}));

export default useGeoStore;
