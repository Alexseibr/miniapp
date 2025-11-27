import apiClient from './apiClient';
import { ApiResponse, User } from '../types';

export interface UpdateProfilePayload {
  name?: string;
  city?: string;
  avatarUrl?: string;
  role?: 'user' | 'farmer' | 'shop';
}

export const profileApi = {
  getProfile: () => apiClient.get<ApiResponse<User>>('/users/me'),
  updateProfile: (payload: UpdateProfilePayload) => apiClient.patch<ApiResponse<User>>('/users/me', payload)
};
