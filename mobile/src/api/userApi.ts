import { httpClient } from './httpClient';
import { User } from '../types/user';

export const userApi = {
  getMe: () => httpClient.get<User>('/users/me'),
  updateMe: (payload: Partial<Pick<User, 'name' | 'cityCode' | 'phone' | 'username'>>) =>
    httpClient.put<User>('/users/me', payload)
};
