// Temporary stub for @shared/schema
// This file provides minimal types needed for the frontend

export interface Ad {
  id: string;
  title: string;
  description?: string;
  price: number;
  categoryId: string;
  subcategoryId: string;
  sellerTelegramId: number;
  photos?: string[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  slug: string;
  name: string;
  parentSlug?: string | null;
  subcategories?: Category[];
}

export interface Season {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Order {
  id: string;
  telegramId: number;
  items: OrderItem[];
  totalPrice: number;
  status: string;
  createdAt?: string;
}

export interface OrderItem {
  adId: string;
  title: string;
  price: number;
  quantity: number;
}
