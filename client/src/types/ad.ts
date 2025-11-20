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
  category?: string;
  subcategory?: string;
  images?: string[];
  photos?: string[];
  sellerTelegramId?: number;
  location?: AdLocation;
};
