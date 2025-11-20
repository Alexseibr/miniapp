export type UserRole = 'buyer' | 'seller' | 'both' | 'moderator' | 'admin' | 'user';

export interface TelegramProfile {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
}

export interface UserProfile {
  id?: string;
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  phoneVerified?: boolean;
  phone?: string | null;
  instagram?: string | null;
  showUsername?: boolean;
  showPhone?: boolean;
  showInstagram?: boolean;
  location?: {
    lat?: number;
    lng?: number;
    updatedAt?: string;
  } | null;
}

export interface CategoryNode {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  subcategories?: CategoryNode[];
}

export interface DeliveryOption {
  type?: string | null;
  radiusKm?: number | null;
}

export interface AdPreview {
  _id: string;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  photos?: string[];
  categoryId: string;
  subcategoryId: string;
  sellerTelegramId: number;
  status?: string;
  seasonCode?: string | null;
  favoritesCount?: number;
  distanceKm?: number;
  attributes?: Record<string, string | number>;
  deliveryOptions?: DeliveryOption[];
  isLiveSpot?: boolean;
  deliveryType?: 'pickup_only' | 'delivery_only' | 'delivery_and_pickup' | null;
  deliveryRadiusKm?: number | null;
  location?: {
    lat?: number;
    lng?: number;
  } | null;
  createdAt?: string;
}

export interface Ad extends AdPreview {
  moderationStatus?: 'pending' | 'approved' | 'rejected';
  lifetimeDays: number;
  validUntil?: string;
  updatedAt?: string;
}

export interface FavoriteItem {
  adId: string;
  ad?: AdPreview;
  createdAt: string;
  lastKnownPrice?: number | null;
  lastKnownStatus?: string | null;
}

export interface AdsResponse {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  items: AdPreview[];
}

export interface SeasonInfo {
  _id: string;
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  specialFilters?: {
    enableTulips?: boolean;
    enableCraft?: boolean;
    enableFarm?: boolean;
  };
}

export interface CartItem {
  adId: string;
  title: string;
  price: number;
  quantity: number;
  sellerTelegramId?: number;
  photo?: string;
}

export interface OrderPayload {
  buyerTelegramId: number;
  comment?: string;
  seasonCode?: string;
  items: {
    adId: string;
    quantity: number;
  }[];
}

export type OrderStatus = 'new' | 'processed' | 'completed' | 'cancelled' | 'expired' | 'archived';

export interface OrderItemSummary {
  adId: string;
  title?: string;
  quantity?: number;
  price?: number;
  sellerTelegramId?: number;
}

export interface OrderSummary {
  _id: string;
  status: OrderStatus;
  createdAt?: string;
  seasonCode?: string | null;
  items: OrderItemSummary[];
}
