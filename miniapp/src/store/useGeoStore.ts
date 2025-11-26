import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getTelegramWebApp } from '@/utils/telegram';

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
  lastLocationUpdate: number | null;
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
  refreshLocationOnAppStart: () => Promise<void>;
}

const SMART_RADIUS_STEPS = [0.3, 0.5, 1, 2, 3, 5, 10, 20];
const MIN_ADS_TARGET = 10;
const MAX_ADS_TARGET = 30;

async function resolveCity(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(`/api/geo/resolve?lat=${lat}&lng=${lng}`);
    if (response.ok) {
      const data = await response.json();
      return data.city || data.address || null;
    }
  } catch (e) {
    console.warn('Failed to resolve city name:', e);
  }
  return null;
}

async function requestTelegramLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    const tg = getTelegramWebApp();
    
    if (!tg || !(tg as any).LocationManager) {
      console.log('📍 Telegram LocationManager not available, trying browser...');
      resolve(null);
      return;
    }

    try {
      console.log('📍 Requesting location via Telegram LocationManager...');
      (tg as any).LocationManager.getLocation((locationData: any) => {
        if (locationData && locationData.latitude && locationData.longitude) {
          console.log('📍 Telegram location received:', locationData);
          resolve({ lat: locationData.latitude, lng: locationData.longitude });
        } else {
          console.log('📍 Telegram location denied or unavailable');
          resolve(null);
        }
      });
      
      setTimeout(() => resolve(null), 10000);
    } catch (error) {
      console.error('📍 Telegram location error:', error);
      resolve(null);
    }
  });
}

async function requestBrowserLocation(): Promise<{ lat: number; lng: number } | null> {
  if (!('geolocation' in navigator)) {
    console.log('📍 Browser geolocation not supported');
    return null;
  }
  
  return new Promise((resolve) => {
    console.log('📍 Requesting location via browser...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('📍 Browser location received:', position.coords);
        resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      (error) => {
        console.log('📍 Browser location error:', error.message);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

// Принудительная очистка старого кэша перед инициализацией store
const GEO_RESET_KEY = 'ketmar-geo-reset-v4';
const GEO_STORE_KEY = 'ketmar-geo-store';
if (typeof window !== 'undefined' && !localStorage.getItem(GEO_RESET_KEY)) {
  console.log('🗑️ [GeoStore] Полная очистка кэша геолокации');
  localStorage.removeItem(GEO_STORE_KEY);
  localStorage.setItem(GEO_RESET_KEY, 'done');
}

const useGeoStore = create<GeoState>()(
  persist(
    (set, get) => ({
      coords: null,
      status: 'idle',
      error: undefined,
      radiusKm: 30,
      cityName: null,
      hasCompletedOnboarding: false,
      smartRadiusEnabled: false,
      mapCenter: null,
      sheetHeight: 'half',
      lastLocationUpdate: null,

      async requestLocation() {
        set({ status: 'loading', error: undefined });
        
        let location = await requestTelegramLocation();
        
        if (!location) {
          location = await requestBrowserLocation();
        }
        
        if (location) {
          set({
            coords: { lat: location.lat, lng: location.lng },
            status: 'ready',
            lastLocationUpdate: Date.now(),
          });
          
          const cityName = await resolveCity(location.lat, location.lng);
          if (cityName) {
            set({ cityName });
          }
          
          console.log('✅ Геолокация обновлена:', location, cityName);
        } else {
          set({ status: 'error', error: 'Не удалось получить местоположение' });
        }
      },
      
      async refreshLocationOnAppStart() {
        console.log('🔄 Запрос актуальной геолокации при старте приложения...');
        // Сбрасываем старые координаты чтобы получить свежие
        set({ coords: null, status: 'loading', cityName: null });
        await get().requestLocation();
      },

      setRadius(value) {
        const clampedValue = Math.max(5, Math.min(100, value));
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
        // НЕ сохраняем coords и cityName - они должны обновляться при каждом запуске
        radiusKm: state.radiusKm,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        smartRadiusEnabled: state.smartRadiusEnabled,
      }),
    }
  )
);

export default useGeoStore;
