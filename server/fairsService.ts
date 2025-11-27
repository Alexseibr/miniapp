import { randomUUID } from "crypto";
import ngeohash from "ngeohash";

export type FairType = "holiday" | "autumn_farm";

export interface GeoRules {
  radiusMeters: number;
  zoneRadiusMeters: number;
  maxStaticSlots: number;
}

export interface Fair {
  id: string;
  slug: string;
  title: string;
  description?: string;
  type: FairType;
  allowedRoles: string[];
  dateStart: Date;
  dateEnd: Date;
  isActive: boolean;
  geoRules: GeoRules;
  createdAt: Date;
  updatedAt: Date;
}

export interface FairStaticSlot {
  sellerId: string;
  adId?: string;
  activatedAt: Date;
  expiresAt?: Date;
}

export interface FairZoneSlot {
  id: string;
  fairId: string;
  zoneId: string;
  maxStaticSlots: number;
  staticSlots: FairStaticSlot[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FairAd {
  id: string;
  title: string;
  sellerId: string;
  location: { lat: number; lng: number };
  isActive: boolean;
  fairId?: string | null;
  isFairFeatured?: boolean;
}

const DEFAULT_GEO_RULES: GeoRules = {
  radiusMeters: 2000,
  zoneRadiusMeters: 500,
  maxStaticSlots: 2,
};

const fairs: Fair[] = [
  {
    id: randomUUID(),
    slug: "newyear_2025",
    title: "Новогодняя ярмарка",
    description: "Праздничные предложения рядом с вами",
    type: "holiday",
    allowedRoles: ["SHOP", "SELLER"],
    dateStart: new Date(new Date().getFullYear(), 11, 1),
    dateEnd: new Date(new Date().getFullYear() + 1, 0, 15),
    isActive: true,
    geoRules: { ...DEFAULT_GEO_RULES },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: randomUUID(),
    slug: "harvest_2025",
    title: "Осенняя фермерская ярмарка",
    description: "Лучшие фермерские продукты",
    type: "autumn_farm",
    allowedRoles: ["FARMER"],
    dateStart: new Date(new Date().getFullYear(), 8, 1),
    dateEnd: new Date(new Date().getFullYear(), 10, 30),
    isActive: true,
    geoRules: { ...DEFAULT_GEO_RULES },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const fairZoneSlots: FairZoneSlot[] = [];

const ads: FairAd[] = [
  {
    id: "ad-1",
    title: "Праздничный набор",
    sellerId: "seller-1",
    location: { lat: 53.9, lng: 27.5667 },
    isActive: true,
    fairId: null,
    isFairFeatured: true,
  },
  {
    id: "ad-2",
    title: "Свежие овощи",
    sellerId: "farmer-1",
    location: { lat: 53.91, lng: 27.57 },
    isActive: true,
    fairId: null,
    isFairFeatured: true,
  },
];

function metersToLatStep(meters: number): number {
  const earthRadiusMeters = 6371000;
  return (meters / earthRadiusMeters) * (180 / Math.PI);
}

function metersToLngStep(lat: number, meters: number): number {
  const earthRadiusMeters = 6371000;
  return ((meters / earthRadiusMeters) * (180 / Math.PI)) / Math.cos((lat * Math.PI) / 180);
}

export function getZoneId(lat: number, lng: number, zoneRadiusMeters = DEFAULT_GEO_RULES.zoneRadiusMeters): string {
  const latStep = metersToLatStep(zoneRadiusMeters);
  const lngStep = metersToLngStep(lat, zoneRadiusMeters);
  const latBucket = Math.round(lat / latStep);
  const lngBucket = Math.round(lng / lngStep);
  return `${zoneRadiusMeters}:${latBucket}:${lngBucket}`;
}

export function encodeZone(lat: number, lng: number, zoneRadiusMeters = DEFAULT_GEO_RULES.zoneRadiusMeters): string {
  try {
    const precision = Math.max(1, Math.min(10, Math.round(Math.log10(40000000 / zoneRadiusMeters))));
    return ngeohash.encode(lat, lng, precision);
  } catch {
    return getZoneId(lat, lng, zoneRadiusMeters);
  }
}

export function createFair(payload: Omit<Fair, "id" | "createdAt" | "updatedAt">): Fair {
  const now = new Date();
  const fair: Fair = {
    ...payload,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  fairs.push(fair);
  return fair;
}

export function listFairs(): Fair[] {
  return fairs;
}

export function findFairById(id: string): Fair | undefined {
  return fairs.find((fair) => fair.id === id);
}

export function findFairBySlug(slug: string): Fair | undefined {
  return fairs.find((fair) => fair.slug === slug);
}

export function updateFair(id: string, updates: Partial<Fair>): Fair | undefined {
  const fair = findFairById(id);
  if (!fair) return undefined;
  Object.assign(fair, updates, { updatedAt: new Date() });
  return fair;
}

export function deactivateFair(id: string): Fair | undefined {
  return updateFair(id, { isActive: false });
}

export function isFairCurrentlyActive(fair: Fair, reference = new Date()): boolean {
  return fair.isActive && reference >= fair.dateStart && reference <= fair.dateEnd;
}

export function getActiveFairsForRole(role: string, now = new Date()): Fair[] {
  return fairs.filter((fair) => isFairCurrentlyActive(fair, now) && fair.allowedRoles.includes(role));
}

export async function canSellerUseTopSlot(_sellerId: string, _fairId: string): Promise<boolean> {
  return true;
}

function ensureZoneSlot(fairId: string, zoneId: string, maxStaticSlots: number): FairZoneSlot {
  let slot = fairZoneSlots.find((entry) => entry.fairId === fairId && entry.zoneId === zoneId);
  if (!slot) {
    const now = new Date();
    slot = {
      id: randomUUID(),
      fairId,
      zoneId,
      maxStaticSlots,
      staticSlots: [],
      createdAt: now,
      updatedAt: now,
    };
    fairZoneSlots.push(slot);
  }
  return slot;
}

export interface ClaimTopSlotResult {
  slot: FairZoneSlot;
  isTopSeller: boolean;
}

export function claimTopSlotForSeller(params: {
  fair: Fair;
  sellerId: string;
  lat: number;
  lng: number;
}): ClaimTopSlotResult {
  const zoneId = getZoneId(params.lat, params.lng, params.fair.geoRules.zoneRadiusMeters);
  const slot = ensureZoneSlot(params.fair.id, zoneId, params.fair.geoRules.maxStaticSlots);
  const alreadyInSlot = slot.staticSlots.find((staticSlot) => staticSlot.sellerId === params.sellerId);
  if (alreadyInSlot) {
    return { slot, isTopSeller: true };
  }
  if (slot.staticSlots.length >= slot.maxStaticSlots) {
    const error = new Error("Top slots in this zone are already taken");
    // @ts-ignore
    error.status = 409;
    throw error;
  }
  slot.staticSlots.push({ sellerId: params.sellerId, activatedAt: new Date() });
  slot.updatedAt = new Date();
  return { slot, isTopSeller: true };
}

export function getTopSlotsForZone(fairId: string, zoneId: string): FairZoneSlot | undefined {
  return fairZoneSlots.find((slot) => slot.fairId === fairId && slot.zoneId === zoneId);
}

export function setAdFairParticipation(params: { adId: string; sellerId: string; fairId: string | null }): FairAd | undefined {
  const ad = ads.find((item) => item.id === params.adId && item.sellerId === params.sellerId);
  if (!ad) return undefined;
  ad.fairId = params.fairId;
  return ad;
}

export function listSellerAds(sellerId: string): FairAd[] {
  return ads.filter((ad) => ad.sellerId === sellerId);
}

export function listAds(): FairAd[] {
  return ads;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getFairFeed(params: {
  fair: Fair;
  lat: number;
  lng: number;
  page?: number;
  limit?: number;
}): { items: FairAd[]; total: number } {
  const page = params.page && params.page > 0 ? params.page : 1;
  const limit = params.limit && params.limit > 0 ? params.limit : 20;
  const filtered = ads
    .filter((ad) => ad.isActive && ad.fairId === params.fair.id)
    .map((ad) => ({ ad, distance: haversineDistance(params.lat, params.lng, ad.location.lat, ad.location.lng) }))
    .filter(({ distance }) => distance <= params.fair.geoRules.radiusMeters)
    .sort((a, b) => a.distance - b.distance)
    .map(({ ad }) => ad);
  const total = filtered.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  return { items: filtered.slice(start, end), total };
}

export function summarizeSellerParticipation(params: { sellerId: string; fair: Fair; lat?: number; lng?: number }) {
  const sellerAds = listSellerAds(params.sellerId).filter((ad) => ad.fairId === params.fair.id);
  const zoneId = params.lat !== undefined && params.lng !== undefined
    ? getZoneId(params.lat, params.lng, params.fair.geoRules.zoneRadiusMeters)
    : undefined;
  const zoneSlot = zoneId ? getTopSlotsForZone(params.fair.id, zoneId) : undefined;
  const isTopSeller = !!zoneSlot?.staticSlots.some((slot) => slot.sellerId === params.sellerId);
  return {
    hasAds: sellerAds.length > 0,
    isTopSeller,
  };
}
