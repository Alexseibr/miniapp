import { create } from 'zustand';
import { getCurrentLocation } from '../services/locationService';
import { LocationPoint } from '../types';

interface GeoState {
  currentLocation: LocationPoint | null;
  radiusKm: number;
  city: string | null;
  loading: boolean;
  setLocation: (location: LocationPoint | null) => void;
  setRadius: (radius: number) => void;
  detectLocation: () => Promise<LocationPoint | null>;
}

export const useGeoStore = create<GeoState>((set) => ({
  currentLocation: null,
  radiusKm: 10,
  city: null,
  loading: false,
  setLocation(location) {
    set({ currentLocation: location });
  },
  setRadius(radius) {
    set({ radiusKm: radius });
  },
  async detectLocation() {
    set({ loading: true });
    const location = await getCurrentLocation();
    set({ currentLocation: location, loading: false });
    return location;
  }
}));
