import { apiClient } from './apiClient';

export const profileApi = {
  getProfile() {
    return apiClient.get('/users/me');
  },
  updateProfile(payload: Record<string, unknown>) {
    return apiClient.patch('/users/me', payload);
  },
};
