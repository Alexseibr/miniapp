import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import apiClient from '../api/apiClient';
import { LocationPoint } from '../types';

export interface RegisterDevicePayload {
  userId?: string;
  pushToken: string;
  platform: 'ios' | 'android' | 'web';
  appVersion?: string;
  geo?: LocationPoint;
}

export async function registerForPushNotificationsAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export const pushService = {
  async registerDevice(userId: string | undefined, geo?: LocationPoint) {
    const pushToken = await registerForPushNotificationsAsync();
    if (!pushToken) return null;
    const payload: RegisterDevicePayload = {
      userId,
      pushToken,
      platform: Constants.platform?.ios ? 'ios' : Constants.platform?.android ? 'android' : 'web',
      appVersion: Constants.expoConfig?.version,
      geo
    };
    // TODO: заменить на реальный backend endpoint `/api/devices/register` (пока нет в API.md)
    await apiClient.post('/devices/register', payload);
    return pushToken;
  },
  async updateDeviceGeo(deviceId: string, geo: LocationPoint) {
    // TODO: заменить на реальный backend endpoint `/api/devices/geo` (пока нет в API.md)
    await apiClient.post(`/devices/${deviceId}/geo`, { geo });
  }
};
