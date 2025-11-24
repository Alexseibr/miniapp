export interface Ad {
  id: string;
  title: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  location?: string;
  distanceKm?: number;
  categoryId?: string;
}
