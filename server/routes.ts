import type { Express } from "express";
import { Router } from "express";
import { createServer, type Server } from "http";
import {
  calculateSellerQualityScore,
  getListingAnalytics,
  getPricePosition,
  getShopOverviewAnalytics,
} from "./analyticsService";
import { listNearbyAds } from "./geoFeedService";
import {
  canSellerUseTopSlot,
  claimTopSlotForSeller,
  createFair,
  deactivateFair,
  findFairById,
  findFairBySlug,
  getActiveFairsForRole,
  getFairFeed,
  getTopSlotsForZone,
  getZoneId,
  isFairCurrentlyActive,
  listAds,
  listFairs,
  setAdFairParticipation,
  summarizeSellerParticipation,
  updateFair,
} from "./fairsService";

function parseDateRange(query: Record<string, string | undefined>) {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(new Date().setDate(to.getDate() - 7));
  return { from, to };
}

export async function registerRoutes(app: Express): Promise<Server> {
  const api = Router();

  api.use((req, _res, next) => {
    const userId = req.header("x-user-id") || "seller-1";
    const userRole = req.header("x-user-role") || "SELLER";
    (req as any).user = { id: userId, role: userRole };
    next();
  });

  api.get("/ads/near", (req, res) => {
    const { lat, lng, radius, geoZoneId, limit, cursor } = req.query as {
      lat?: string;
      lng?: string;
      radius?: string;
      geoZoneId?: string;
      limit?: string;
      cursor?: string;
    };

    if (!lat || !lng) {
      return res.status(400).json({ message: "lat and lng are required" });
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      return res.status(400).json({ message: "lat and lng must be valid numbers" });
    }

    const parsedRadius = radius ? parseFloat(radius) : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;

    const feed = listNearbyAds({
      lat: parsedLat,
      lng: parsedLng,
      radiusMeters: parsedRadius,
      geoZoneId: geoZoneId || undefined,
      limit: parsedLimit,
      cursor: cursor || undefined,
    });

    return res.json(feed);
  });

  api.get("/shops/:shopId/analytics/overview", (req, res) => {
    const { shopId } = req.params;
    const range = parseDateRange(req.query as Record<string, string | undefined>);
    const overview = getShopOverviewAnalytics(shopId, range);
    if (!overview) {
      return res.status(404).json({ message: "Shop not found" });
    }
    return res.json(overview);
  });

  api.get("/shops/:shopId/listings/:listingId/analytics", (req, res) => {
    const { shopId, listingId } = req.params;
    const range = parseDateRange(req.query as Record<string, string | undefined>);
    const analytics = getListingAnalytics(shopId, listingId, range);
    if (!analytics) {
      return res.status(404).json({ message: "Listing not found" });
    }
    return res.json(analytics);
  });

  api.get("/shops/:shopId/listings/:listingId/price-position", (req, res) => {
    const { shopId, listingId } = req.params;
    const { region } = req.query as { region?: string };
    const listingAnalytics = getListingAnalytics(shopId, listingId, parseDateRange({}));
    if (!listingAnalytics) {
      return res.status(404).json({ message: "Listing not found" });
    }
    const position = getPricePosition(listingId, region);
    return res.json(position);
  });

  api.get("/admin/shops/:shopId/quality-score", (req, res) => {
    const { shopId } = req.params;
    const score = calculateSellerQualityScore(shopId);
    if (!score) {
      return res.status(404).json({ message: "Shop not found" });
    }
    return res.json(score);
  });

  api.post("/admin/fairs", (req, res) => {
    const payload = req.body as any;
    const allowedRoles =
      payload.type === "holiday" ? ["SHOP", "SELLER"] : payload.type === "autumn_farm" ? ["FARMER"] : payload.allowedRoles;
    const geoRules = {
      radiusMeters: payload.geoRules?.radiusMeters ?? 2000,
      zoneRadiusMeters: payload.geoRules?.zoneRadiusMeters ?? 500,
      maxStaticSlots: payload.geoRules?.maxStaticSlots ?? 2,
    };
    const fair = createFair({
      slug: payload.slug,
      title: payload.title,
      description: payload.description,
      type: payload.type,
      allowedRoles,
      dateStart: new Date(payload.dateStart),
      dateEnd: new Date(payload.dateEnd),
      isActive: payload.isActive ?? true,
      geoRules,
    });
    return res.status(201).json(fair);
  });

  api.get("/admin/fairs", (_req, res) => {
    return res.json(listFairs());
  });

  api.get("/admin/fairs/:id", (req, res) => {
    const fair = findFairById(req.params.id);
    if (!fair) return res.status(404).json({ message: "Fair not found" });
    return res.json(fair);
  });

  api.patch("/admin/fairs/:id", (req, res) => {
    const fair = updateFair(req.params.id, req.body);
    if (!fair) return res.status(404).json({ message: "Fair not found" });
    return res.json(fair);
  });

  api.delete("/admin/fairs/:id", (req, res) => {
    const fair = deactivateFair(req.params.id);
    if (!fair) return res.status(404).json({ message: "Fair not found" });
    return res.json(fair);
  });

  api.get("/seller/fairs/available", (req, res) => {
    const user = (req as any).user as { id: string; role: string };
    const { lat, lng } = req.query as { lat?: string; lng?: string };
    const fairs = getActiveFairsForRole(user.role);
    const participation = fairs.map((fair) => ({
      fair,
      participation: summarizeSellerParticipation({
        sellerId: user.id,
        fair,
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
      }),
    }));
    return res.json(participation);
  });

  api.post("/seller/fairs/:fairId/ads/:adId/join", (req, res) => {
    const user = (req as any).user as { id: string; role: string };
    const fair = findFairById(req.params.fairId);
    if (!fair) return res.status(404).json({ message: "Fair not found" });
    if (!isFairCurrentlyActive(fair)) return res.status(400).json({ message: "Fair is not active" });
    if (!fair.allowedRoles.includes(user.role)) return res.status(403).json({ message: "Role not allowed for this fair" });
    const ad = setAdFairParticipation({ adId: req.params.adId, sellerId: user.id, fairId: fair.id });
    if (!ad) return res.status(404).json({ message: "Ad not found or not owned" });
    return res.json(ad);
  });

  api.post("/seller/fairs/:fairId/ads/:adId/leave", (req, res) => {
    const user = (req as any).user as { id: string; role: string };
    const fair = findFairById(req.params.fairId);
    if (!fair) return res.status(404).json({ message: "Fair not found" });
    const ad = setAdFairParticipation({ adId: req.params.adId, sellerId: user.id, fairId: null });
    if (!ad) return res.status(404).json({ message: "Ad not found or not owned" });
    return res.json(ad);
  });

  api.post("/seller/fairs/:fairId/top-slot/claim", async (req, res, next) => {
    try {
      const user = (req as any).user as { id: string; role: string };
      const fair = findFairById(req.params.fairId);
      if (!fair) return res.status(404).json({ message: "Fair not found" });
      if (!isFairCurrentlyActive(fair)) return res.status(400).json({ message: "Fair is not active" });
      if (!fair.allowedRoles.includes(user.role)) return res.status(403).json({ message: "Role not allowed" });
      const { lat, lng } = req.body as { lat: number; lng: number };
      if (!(await canSellerUseTopSlot(user.id, fair.id))) {
        return res.status(403).json({ message: "Seller cannot use top slot" });
      }
      const result = claimTopSlotForSeller({ fair, sellerId: user.id, lat, lng });
      return res.json({ ...result, zoneId: getZoneId(lat, lng, fair.geoRules.zoneRadiusMeters) });
    } catch (error) {
      next(error);
    }
  });

  api.get("/public/fairs/active", (req, res) => {
    const { lat, lng } = req.query as { lat?: string; lng?: string };
    const now = new Date();
    const activeFairs = listFairs().filter((fair) => isFairCurrentlyActive(fair, now));
    const primaryFair = activeFairs[0];
    return res.json({ fairs: activeFairs, primaryFair, location: { lat, lng } });
  });

  api.get("/public/fairs/:slug/top-slots", (req, res) => {
    const fair = findFairBySlug(req.params.slug) || findFairById(req.params.slug);
    if (!fair) return res.status(404).json({ message: "Fair not found" });
    const { lat, lng } = req.query as { lat?: string; lng?: string };
    if (!lat || !lng) return res.status(400).json({ message: "lat and lng are required" });
    const zoneId = getZoneId(parseFloat(lat), parseFloat(lng), fair.geoRules.zoneRadiusMeters);
    const slot = getTopSlotsForZone(fair.id, zoneId);
    return res.json({ fair, zoneId, slot });
  });

  api.get("/public/fairs/:slug/feed", (req, res) => {
    const fair = findFairBySlug(req.params.slug) || findFairById(req.params.slug);
    if (!fair) return res.status(404).json({ message: "Fair not found" });
    const { lat, lng, page, limit } = req.query as { lat?: string; lng?: string; page?: string; limit?: string };
    if (!lat || !lng) return res.status(400).json({ message: "lat and lng are required" });
    const feed = getFairFeed({
      fair,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return res.json({ fair, ...feed });
  });

  api.get("/public/fairs/:slug/ads", (_req, res) => {
    return res.json(listAds());
  });

  app.use("/api", api);

  const httpServer = createServer(app);

  return httpServer;
}
