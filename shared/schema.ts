// Temporary stub for @shared/schema
// This file provides minimal types needed for the frontend and server stubs

import { z } from "zod";

export interface User {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  name?: string | null;
  phone?: string | null;
  role?: string;
  createdAt?: Date;
}

export interface InsertUser {
  telegramId: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  phone?: string | null;
  role?: string;
}

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
  id: string;
  slug?: string;
  name: string;
  description?: string;
  icon?: string;
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

export const insertProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  categoryId: z.string().min(1, "Category is required"),
  stock: z.number().int().nonnegative().default(0),
  status: z.string().default("active"),
  images: z.array(z.string()).default([]),
});

export interface Product extends z.infer<typeof insertProductSchema> {
  id: string;
}
