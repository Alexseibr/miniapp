export type NearbyAdsParams = {
  lat: number;
  lng: number;
  radiusKm: number;
  categoryId?: string;
  subcategoryId?: string;
  limit?: number;
};

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
  categoryId?: string;
  subcategoryId?: string;
  distanceKm?: number;
  deliveryType?: "pickup_only" | "delivery_only" | "delivery_and_pickup";
  deliveryOptions?: string[];
  deliveryRadiusKm?: number | null;
  location?: AdLocation;
  photos?: string[];
  sellerTelegramId?: number;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api`;

const normalizedBaseUrl = API_BASE_URL.endsWith("/")
  ? API_BASE_URL
  : `${API_BASE_URL}/`;

export async function getNearbyAds(params: NearbyAdsParams): Promise<Ad[]> {
  const search = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    radiusKm: String(params.radiusKm),
  });

  if (params.categoryId) search.set("categoryId", params.categoryId);
  if (params.subcategoryId) search.set("subcategoryId", params.subcategoryId);
  if (params.limit) search.set("limit", String(params.limit));

  const url = `${normalizedBaseUrl}ads/nearby?${search.toString()}`;

  const response = await fetch(url, { credentials: "include" });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Не удалось загрузить объявления рядом");
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.items ?? [];
}
