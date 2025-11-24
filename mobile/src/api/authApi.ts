import { httpClient } from './httpClient';
import { User } from '../types/user';

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export const authApi = {
  requestPhoneCode: (phone: string) =>
    httpClient.post<void>('/auth/phone/request', { phone }),
  verifyPhoneCode: (phone: string, code: string) =>
    httpClient.post<AuthResponse>('/auth/phone/verify', { phone, code }),
  telegramWidgetLogin: (data: Record<string, string>) =>
    httpClient.get<AuthResponse>('/auth/telegram/widget/callback', { params: data }),
  botTokenLogin: (token: string) => httpClient.post<AuthResponse>('/auth/bot/consume', { token })
};
