import http from './http';

export interface UpdateLocationPayload {
  lat: number;
  lng: number;
}

export async function updateUserLocation(payload: UpdateLocationPayload) {
  try {
    await http.post('/api/users/set-location', payload);
  } catch (error) {
    console.warn('set-location endpoint unavailable:', error);
  }
}
