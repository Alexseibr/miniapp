import * as Location from 'expo-location';

export interface Coordinates {
  lat: number;
  lng: number;
}

export const locationService = {
  async requestPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  async getCurrentLocation(): Promise<Coordinates | null> {
    const hasPerm = await this.requestPermission();
    if (!hasPerm) return null;
    const loc = await Location.getCurrentPositionAsync({});
    return {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
    };
  },
};
