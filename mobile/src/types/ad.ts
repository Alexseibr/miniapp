export interface AdLocation {
  type: 'Point';
  coordinates: [number, number];
}

export interface Ad {
  id: string;
  title: string;
  price?: number;
  currency?: string;
  cityCode?: string;
  imageUrl?: string;
  seasonCode?: string;
  location?: AdLocation;
}
