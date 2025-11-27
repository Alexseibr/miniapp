import { DEFAULT_ZONE_RADIUS_METERS, RADIUS_STEPS_METERS, getZoneId, haversineDistance, normalizeRadius } from "./geoFeedUtils";
import { GEO_ADS, GeoAdMock } from "./mock/geoAds";

export interface NearbyAdPreview {
  id: string;
  title: string;
  price: number;
  thumb: string;
  sellerType: GeoAdMock["sellerType"];
  distanceMeters: number;
  geoZoneId: string;
  createdAt: Date;
}

export interface NearbyAdsParams {
  lat: number;
  lng: number;
  radiusMeters?: number;
  geoZoneId?: string;
  limit?: number;
  cursor?: string;
}

interface CursorPayload {
  id: string;
  createdAt: string;
}

function encodeCursor(ad: GeoAdMock): string {
  return `${ad.createdAt.toISOString()}__${ad.id}`;
}

function decodeCursor(cursor?: string): CursorPayload | null {
  if (!cursor) return null;
  const [createdAt, id] = cursor.split("__");
  if (!createdAt || !id) return null;
  return { createdAt, id };
}

export function listNearbyAds(params: NearbyAdsParams) {
  const { radiusMeters, radiusStepIndex } = normalizeRadius(params.radiusMeters);
  const userZoneId = params.geoZoneId ?? getZoneId(params.lat, params.lng, DEFAULT_ZONE_RADIUS_METERS);
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 30);
  const cursor = decodeCursor(params.cursor);

  const filtered = GEO_ADS.map((ad) => ({
    ad,
    distance: haversineDistance(params.lat, params.lng, ad.location.lat, ad.location.lng),
  }))
    .filter(({ ad, distance }) => ad.geoZoneId === userZoneId && distance <= radiusMeters)
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return b.ad.createdAt.getTime() - a.ad.createdAt.getTime();
    });

  const startIndex = cursor
    ? filtered.findIndex(({ ad }) => ad.id === cursor.id && ad.createdAt.toISOString() === cursor.createdAt) + 1
    : 0;

  const safeStartIndex = startIndex > 0 ? startIndex : 0;
  const pageItems = filtered.slice(safeStartIndex, safeStartIndex + limit);
  const hasMore = safeStartIndex + limit < filtered.length;

  const nextCursor = hasMore && pageItems.length > 0 ? encodeCursor(pageItems[pageItems.length - 1].ad) : undefined;

  return {
    geoZoneId: userZoneId,
    radiusMeters,
    radiusStepIndex,
    total: filtered.length,
    limit,
    items: pageItems.map(({ ad, distance }) => ({
      id: ad.id,
      title: ad.title,
      price: ad.price,
      sellerType: ad.sellerType,
      thumb: ad.thumb,
      geoZoneId: ad.geoZoneId,
      createdAt: ad.createdAt,
      distanceMeters: Math.round(distance),
    } satisfies NearbyAdPreview)),
    nextCursor,
    availableSteps: RADIUS_STEPS_METERS,
  };
}
