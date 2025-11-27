export type ShopStatus = "pending" | "approved" | "rejected" | "paused";

export interface ShopLocation {
  lat: number;
  lng: number;
  city: string;
  district?: string;
  addressLine?: string;
}

export type AnalyticsPlan = "free" | "pro" | "max";

export interface Shop {
  id: string;
  ownerUserId: string;
  name: string;
  description: string;
  logoUrl?: string;
  instagram?: string;
  website?: string;
  telegramUsername?: string;
  phone?: string;
  unp?: string;
  ownerFullName?: string;
  location: ShopLocation;
  sellerType: "farmer" | "shop" | "individual";
  status: ShopStatus;
  moderationComment?: string;
  createdAt: Date;
  updatedAt: Date;
  analyticsPlan: AnalyticsPlan;
  isVerified?: boolean;
  verificationRequested?: boolean;
  verificationAt?: Date;
  slug?: string;
}

export interface ProductTemplate {
  id: string;
  shopId: string;
  title: string;
  description: string;
  categoryId: string;
  photos: string[];
  tags?: string[];
  seasonCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ListingStatus = "active" | "paused" | "finished";

export interface Listing {
  id: string;
  shopId: string;
  productTemplateId: string;
  price: number;
  quantity: number;
  status: ListingStatus;
  location: {
    lat: number;
    lng: number;
    city: string;
    district?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  fairId?: string;
}

export interface ViewEvent {
  id: string;
  userId?: string;
  listingId: string;
  shopId: string;
  ts: Date;
  location?: {
    lat: number;
    lng: number;
    city?: string;
    district?: string;
  };
}

export interface FavoriteEvent {
  id: string;
  userId: string;
  listingId: string;
  shopId: string;
  ts: Date;
}

export interface ContactViewEvent {
  id: string;
  userId: string;
  listingId: string;
  shopId: string;
  ts: Date;
}

type ComplaintReason =
  | "fake_product"
  | "wrong_price"
  | "spam"
  | "rude_seller"
  | "other";

export interface Complaint {
  id: string;
  listingId: string;
  shopId: string;
  fromUserId: string;
  reason: ComplaintReason;
  comment?: string;
  ts: Date;
}

export interface Rating {
  id: string;
  targetType: "listing" | "shop";
  targetId: string;
  fromUserId: string;
  value: 1 | 2 | 3 | 4 | 5;
  reasonCode?: string;
  ts: Date;
}

export interface SellerQualityScore {
  shopId: string;
  score: number; // 0-100
  avgRating?: number;
  complaintsPer1000Views?: number;
  suspiciousFlags: string[];
}

export interface ShopPageViewEvent {
  id: string;
  shopId: string;
  userId?: string;
  ts: Date;
  source?: "telegram" | "instagram" | "direct" | "other";
}

export interface Fair {
  id: string;
  code: string;
  title: string;
  description: string;
  type: "tulips_march8" | "newyear_market" | "autumn_fair" | "custom";
  startAt: Date;
  endAt: Date;
  isActive: boolean;
  bannerImageUrl?: string;
  colorTheme?: string;
  allowedCategoryIds?: string[];
  allowedSellerTypes?: ("farmer" | "shop" | "individual")[];
  createdAt: Date;
}

export interface ShopFairParticipation {
  id: string;
  shopId: string;
  fairId: string;
  status: "pending" | "approved" | "rejected" | "active" | "finished";
  specialNote?: string;
  preferredDelivery?: "pickup" | "courier" | "both";
  createdAt: Date;
  updatedAt: Date;
}
