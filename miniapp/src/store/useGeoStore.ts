import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GeoCoords {
  lat: number;
  lng: number;
}

interface MapCenter {
  lat: number;
  lng: number;
  zoom: number;
}

interface GeoState {
  coords: GeoCoords | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
  radiusKm: number;
  cityName: string | null;
  hasCompletedOnboarding: boolean;
  smartRadiusEnabled: boolean;
  mapCenter: MapCenter | null;
  sheetHeight: 'collapsed' | 'half' | 'full';
  requestLocation: () => Promise<void>;
  setRadius: (value: number) => void;
  setCityName: (city: string | null) => void;
  setCoords: (coords: GeoCoords) => void;
  completeOnboarding: () => void;
  resetGeo: () => void;
  toggleSmartRadius: () => void;
  setMapCenter: (center: MapCenter) => void;
  setSheetHeight: (height: 'collapsed' | 'half' | 'full') => void;
  calculateSmartRadius: (adsCount: number) => void;
}

const SMART_RADIUS_STEPS = [0.3, 0.5, 1, 2, 3, 5, 10, 20];
const MIN_ADS_TARGET = 10;
const MAX_ADS_TARGET = 30;

const useGeoStore = create<GeoState>()(
  persist(
    (set, get) => ({
      coords: null,
      status: 'idle',
      error: undefined,
      radiusKm: 3,
      cityName: null,
      hasCompletedOnboarding: false,
      smartRadiusEnabled: false,
      mapCenter: null,
      sheetHeight: 'half',

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

      toggleSmartRadius() {
        set((state) => ({ smartRadiusEnabled: !state.smartRadiusEnabled }));
      },

      setMapCenter(center) {
        set({ mapCenter: center });
      },

      setSheetHeight(height) {
        set({ sheetHeight: height });
      },

      calculateSmartRadius(adsCount) {
        const { radiusKm, smartRadiusEnabled } = get();
        if (!smartRadiusEnabled) return;

        const currentIdx = SMART_RADIUS_STEPS.findIndex(r => r >= radiusKm);
        
        if (adsCount < MIN_ADS_TARGET && currentIdx < SMART_RADIUS_STEPS.length - 1) {
          set({ radiusKm: SMART_RADIUS_STEPS[currentIdx + 1] });
        } else if (adsCount > MAX_ADS_TARGET && currentIdx > 0) {
          set({ radiusKm: SMART_RADIUS_STEPS[currentIdx - 1] });
        }
      },
    }),
    {
      name: 'ketmar-geo-store',
      partialize: (state) => ({
        coords: state.coords,
        radiusKm: state.radiusKm,
        cityName: state.cityName,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        smartRadiusEnabled: state.smartRadiusEnabled,
      }),
    }
  )
);

export default useGeoStore;
