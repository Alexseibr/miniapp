import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GeoCoords {
  lat: number;
  lng: number;
}

interface GeoState {
  coords: GeoCoords | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  radiusKm: number;
  cityName: string | null;
  hasCompletedOnboarding: boolean;
  requestLocation: () => Promise<void>;
  setRadius: (value: number) => void;
  setCityName: (city: string | null) => void;
  setCoords: (coords: GeoCoords) => void;
  completeOnboarding: () => void;
  resetGeo: () => void;
}

const useGeoStore = create<GeoState>()(
  persist(
    (set, get) => ({
      coords: null,
      status: 'idle',
      error: undefined,
      radiusKm: 3,
      cityName: null,
      hasCompletedOnboarding: false,

      async requestLocation() {
        set({ status: 'loading', error: undefined });
        if ('geolocation' in navigator) {
          await new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                const { latitude, longitude } = position.coords;
                set({
                  coords: { lat: latitude, lng: longitude },
                  status: 'ready',
                });
                
                try {
                  const response = await fetch(`/api/geo/resolve?lat=${latitude}&lng=${longitude}`);
                  if (response.ok) {
                    const data = await response.json();
                    if (data.city || data.address) {
                      set({ cityName: data.city || data.address });
                    }
                  }
                } catch (e) {
                  console.warn('Failed to resolve city name:', e);
                }
                
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
        const clampedValue = Math.max(0.1, Math.min(100, value));
        set({ radiusKm: clampedValue });
      },

      setCityName(city) {
        set({ cityName: city });
      },

      setCoords(coords) {
        set({ coords, status: 'ready' });
      },

      completeOnboarding() {
        set({ hasCompletedOnboarding: true });
      },

      resetGeo() {
        set({
          coords: null,
          status: 'idle',
          error: undefined,
          cityName: null,
        });
      },
    }),
    {
      name: 'ketmar-geo-store',
      partialize: (state) => ({
        coords: state.coords,
        radiusKm: state.radiusKm,
        cityName: state.cityName,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    }
  )
);

export default useGeoStore;
