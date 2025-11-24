import { z } from "zod";

// Temporary stub for @shared/schema
// This file provides minimal types needed for the frontend and server mocks

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
  name: string;
  icon: string;
  description?: string;
  slug?: string;
  parentSlug?: string | null;
  subcategories?: Category[];
}

export const insertProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
  price: z.coerce.number().nonnegative("Price must be positive"),
  categoryId: z.string().min(1, "Category is required"),
  stock: z.coerce.number().int().nonnegative("Stock cannot be negative"),
  status: z.enum(["active", "inactive", "out_of_stock"]).default("active"),
  images: z.array(z.string()).default([]),
});

export type InsertProduct = z.infer<typeof insertProductSchema>;

export interface Product extends InsertProduct {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

export type UserRole = "buyer" | "seller" | "both" | "moderator" | "admin" | "user";

export interface User {
  id: string;
  telegramId: number;
  phone?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: UserRole;
  createdAt?: Date;
}

export type InsertUser = Omit<User, "id" | "createdAt">;

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
