import type { Express } from "express";
import { Router } from "express";
import { createServer, type Server } from "http";
import {
  calculateSellerQualityScore,
  getListingAnalytics,
  getPricePosition,
  getShopOverviewAnalytics,
} from "./analyticsService";

function parseDateRange(query: Record<string, string | undefined>) {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(new Date().setDate(to.getDate() - 7));
  return { from, to };
}

export async function registerRoutes(app: Express): Promise<Server> {
  const api = Router();

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

  app.use("/api", api);

  const httpServer = createServer(app);

  return httpServer;
}
