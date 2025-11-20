export type AdLocation = {
  lat?: number;
  lng?: number;
  address?: string;
};

export type Ad = {
  _id: string;
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  subcategory?: string;
  images?: string[];
  photos?: string[];
  sellerTelegramId?: number;
  location?: AdLocation | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};
