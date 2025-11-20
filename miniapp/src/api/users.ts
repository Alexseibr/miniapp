import api from './axios';

export const getMe = () => api.get('/users/me').then((r) => r.data);

export const updateUserLocation = (coords: { lat?: number; lng?: number }) =>
  api.put('/users/location', coords).then((r) => r.data);
