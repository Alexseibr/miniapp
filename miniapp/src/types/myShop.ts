export type MyShopProductStatus = 'active' | 'draft' | 'expired';

export interface MessengerContacts {
  telegram?: string | null;
  viber?: string | null;
  whatsapp?: string | null;
}

export interface MyShopProduct {
  id: string;
  title: string;
  price: number;
  currency?: string;
  status: MyShopProductStatus;
  preview?: string | null;
  description?: string | null;
  categoryId?: string;
  expiresAt?: string | null;
  createdAt?: string | null;
}

export interface MyShopProductsResponse {
  items: MyShopProduct[];
  total: number;
  limit: number;
  offset: number;
  counts: {
    active: number;
    draft: number;
    expired: number;
  };
}

export interface MyShopStats {
  totalProducts: number;
  activeProducts: number;
  expiredProducts: number;
  totalViews?: number;
  totalFavorites?: number;
}

export interface MyShopProfile {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  instagram?: string | null;
  phone?: string | null;
  messengers?: MessengerContacts;
  telegramUsername?: string | null;
}
