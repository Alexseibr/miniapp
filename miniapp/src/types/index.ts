export type UserRole = 'buyer' | 'seller' | 'both' | 'moderator' | 'admin' | 'super_admin' | 'user';

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
  icon3d?: string | null;
  level?: number;
  isLeaf?: boolean;
  parentSlug?: string | null;
  sortOrder?: number;
  subcategories?: CategoryNode[];
}

export interface DeliveryOption {
  type?: string | null;
  radiusKm?: number | null;
}

export interface PriceBadgeData {
  hasMarketData: boolean;
  marketLevel: 'below' | 'fair' | 'above' | 'unknown';
  diffPercent?: number | null;
  avgPrice?: number | null;
  windowDays?: number | null;
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
  city?: string | null;
  geoLabel?: string | null;
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
  priceBadge?: PriceBadgeData | null;
}

export interface Ad extends AdPreview {
  moderationStatus?: 'pending' | 'approved' | 'rejected' | 'scheduled';
  lifetimeDays: number;
  validUntil?: string;
  updatedAt?: string;
  views?: number;
  viewsTotal?: number;
  impressionsTotal?: number;
  contactClicks?: number;
  sellerName?: string;
  publishAt?: string | Date | null;
  contactPhone?: string | null;
  contactUsername?: string | null;
  contactInstagram?: string | null;
}

export interface FavoriteItem {
  adId: string;
  ad?: AdPreview & {
    oldPrice?: number | null;
    priceChangePercent?: number | null;
    sellerType?: 'private' | 'farmer' | 'shop' | null;
    categoryName?: string | null;
    isUnavailable?: boolean;
  };
  createdAt: string;
  lastKnownPrice?: number | null;
  lastKnownStatus?: string | null;
  notifyOnPriceChange?: boolean;
  notifyOnStatusChange?: boolean;
}

export interface BuyerProfile {
  averageBudget: number;
  preferredCategories: string[];
  preferredRadius: number;
  preferredSellerType: 'private' | 'farmer' | 'shop' | 'any';
  totalFavorites: number;
  activeSegment: 'A' | 'B' | 'C';
}

export interface SimilarAd extends AdPreview {
  matchScore?: number;
  priceAdvantage?: number;
}

export interface AdsResponse {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  items: AdPreview[];
}

export interface FeedItem {
  _id: string;
  title: string;
  description?: string;
  images?: string[];
  photos?: string[];
  previewUrl?: string;
  city: string;
  district: string;
  geoLabel?: string;
  geo: {
    type: string;
    coordinates: [number, number];
  } | null;
  categoryId: string;
  subcategoryId?: string;
  createdAt: string;
  price: number;
  currency: string;
  distanceMeters: number;
  sellerName?: string;
  sellerUsername?: string;
}

export interface FeedResponse {
  items: FeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
  radiusKm: number;
  total: number;
}

export type FeedEventType = 'impression' | 'view_open' | 'like' | 'dislike' | 'scroll_next' | 'scroll_prev';

export interface FeedEvent {
  adId: string;
  eventType: FeedEventType;
  dwellTimeMs?: number;
  positionIndex?: number;
  radiusKm?: number;
  meta?: Record<string, unknown>;
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

export interface CategoryStat {
  categoryId: string;
  count: number;
}

export interface NearbyStatsResponse {
  stats: CategoryStat[];
  total: number;
  radiusKm: number;
}

export type ShopStatus = 'pending' | 'approved' | 'rejected' | 'paused';

export interface Shop {
  id: string;
  name: string;
  logoUrl?: string | null;
  status: ShopStatus;
  slug?: string;
  location?: {
    city?: string | null;
    district?: string | null;
  } | null;
  isVerified?: boolean;
}
