import ngeohash from "ngeohash";

export const RADIUS_STEPS_METERS = [300, 700, 1500, 3000] as const;
export const DEFAULT_ZONE_RADIUS_METERS = 700;

export function normalizeRadius(radiusMeters?: number) {
  const sanitized = Number.isFinite(radiusMeters) ? (radiusMeters as number) : RADIUS_STEPS_METERS[0];
  const clamped = Math.min(Math.max(sanitized, RADIUS_STEPS_METERS[0]), RADIUS_STEPS_METERS[RADIUS_STEPS_METERS.length - 1]);
  const stepIndex = RADIUS_STEPS_METERS.findIndex((step) => clamped <= step);
  const chosenIndex = stepIndex === -1 ? RADIUS_STEPS_METERS.length - 1 : stepIndex;

  return { radiusMeters: RADIUS_STEPS_METERS[chosenIndex], radiusStepIndex: chosenIndex };
}

function metersToLatStep(meters: number): number {
  const earthRadiusMeters = 6371000;
  return (meters / earthRadiusMeters) * (180 / Math.PI);
}

function metersToLngStep(lat: number, meters: number): number {
  const earthRadiusMeters = 6371000;
  return ((meters / earthRadiusMeters) * (180 / Math.PI)) / Math.cos((lat * Math.PI) / 180);
}

export function getZoneId(lat: number, lng: number, zoneRadiusMeters = DEFAULT_ZONE_RADIUS_METERS): string {
  const latStep = metersToLatStep(zoneRadiusMeters);
  const lngStep = metersToLngStep(lat, zoneRadiusMeters);
  const latBucket = Math.round(lat / latStep);
  const lngBucket = Math.round(lng / lngStep);
  return `${zoneRadiusMeters}:${latBucket}:${lngBucket}`;
}

export function encodeGeoHash(lat: number, lng: number, zoneRadiusMeters = DEFAULT_ZONE_RADIUS_METERS): string {
  try {
    const precision = Math.max(1, Math.min(10, Math.round(Math.log10(40000000 / zoneRadiusMeters))));
    return ngeohash.encode(lat, lng, precision);
  } catch {
    return getZoneId(lat, lng, zoneRadiusMeters);
  }
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
