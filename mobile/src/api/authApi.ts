import apiClient from './apiClient';
import { ApiResponse, AuthTokens, User } from '../types';

export interface RequestCodePayload {
  phone: string;
}

export interface ConfirmCodePayload {
  phone: string;
  code: string;
}

export interface ConfirmCodeResponse extends AuthTokens {
  user?: User;
}

export const authApi = {
  requestCode: (payload: RequestCodePayload) =>
    apiClient.post<ApiResponse<null>>('/mobile/v1/auth/request-code', payload),

  confirmCode: (payload: ConfirmCodePayload) =>
    apiClient.post<ApiResponse<ConfirmCodeResponse>>('/mobile/v1/auth/confirm-code', payload),

  telegramAuth: (initData: string) =>
    apiClient.post<ApiResponse<ConfirmCodeResponse>>('/mobile/v1/auth/telegram', { initData }),

  refreshToken: (refreshToken: string) =>
    apiClient.post<ApiResponse<AuthTokens>>('/mobile/v1/auth/refresh', { refreshToken }),

  me: () => apiClient.get<ApiResponse<User>>('/users/me')
};
