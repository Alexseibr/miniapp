import { apiClient } from './apiClient';

export interface RequestPhoneCodePayload {
  phone: string;
}

export interface VerifyCodePayload {
  phone: string;
  code: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface MeResponse {
  id: string;
  username?: string;
  phone: string;
  role: string;
}

export const authApi = {
  requestPhoneCode(payload: RequestPhoneCodePayload) {
    return apiClient.post('/auth/phone/request-code', payload);
  },

  verifyCode(payload: VerifyCodePayload) {
    return apiClient.post<AuthTokens>('/auth/phone/verify', payload);
  },

  me() {
    return apiClient.get<MeResponse>('/auth/me');
  },
};
