export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface User {
  id?: string;
  _id?: string;
  phone: string;
  name?: string;
  avatarUrl?: string;
  city?: string | null;
  role?: 'user' | 'farmer' | 'shop';
  telegramId?: number;
}

export interface LocationPoint {
  lat: number;
  lng: number;
  city?: string | null;
}

export interface AdPreview {
  _id: string;
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  city?: string | null;
  categoryId?: string;
  subcategoryId?: string;
  distanceKm?: number;
  distanceMeters?: number;
  location?: LocationPoint;
  photos?: string[];
  sellerTelegramId?: number;
}

export interface AdDetails extends AdPreview {
  seller?: User;
  createdAt?: string;
  status?: string;
  moderationStatus?: string;
}

export interface CreateAdPayload {
  title: string;
  categoryId: string;
  subcategoryId: string;
  price: number;
  description?: string;
  city?: string;
  location?: {
    lat: number;
    lng: number;
    geo?: {
      type: 'Point';
      coordinates: [number, number];
    };
  };
  sellerTelegramId?: number;
  photos?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore?: boolean;
  page?: number;
  limit?: number;
}

export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export interface FavoritePayload {
  adId: string;
}
