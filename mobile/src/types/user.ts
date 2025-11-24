export type UserRole = 'user' | 'admin' | 'moderator';

export interface User {
  id: string;
  name: string;
  username?: string;
  phone?: string;
  role: UserRole;
  cityCode?: string;
  telegramId?: number;
  createdAt?: string;
}
