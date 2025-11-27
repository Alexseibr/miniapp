import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { LocationPoint } from '../types';

export async function requestLocationPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Геолокация', 'Доступ к геолокации отклонён. Включите его в настройках.');
    return false;
  }
  return true;
}

export async function getCurrentLocation(): Promise<LocationPoint | null> {
  const granted = await requestLocationPermission();
  if (!granted) return null;
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude
  };
}
