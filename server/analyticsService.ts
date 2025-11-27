import {
  contactViewEvents,
  favoriteEvents,
  listings,
  marketPrices,
  productTemplates,
  ratings,
  shops,
  viewEvents,
  complaints,
  shopPageViews,
} from "./mock/analyticsData";
import type {
  Listing,
  SellerQualityScore,
  Shop,
} from "@shared/shops";

interface DateRange {
  from: Date;
  to: Date;
}

const toDayString = (date: Date) => date.toISOString().slice(0, 10);

const inRange = (date: Date, range: DateRange) =>
  date >= range.from && date <= range.to;

const groupByDate = (dates: Date[]) => {
  return dates.reduce<Record<string, number>>((acc, date) => {
    const key = toDayString(date);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
};

function haversineDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLon = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function bucketDistance(km: number): "0-2" | "2-5" | "5-10" | "10+" {
  if (km <= 2) return "0-2";
  if (km <= 5) return "2-5";
  if (km <= 10) return "5-10";
  return "10+";
}

function getShop(shopId: string): Shop | undefined {
  return shops.find((shop) => shop.id === shopId);
}

function getListing(listingId: string): Listing | undefined {
  return listings.find((listing) => listing.id === listingId);
}

export function getShopOverviewAnalytics(shopId: string, range: DateRange) {
  const shop = getShop(shopId);
  if (!shop) return undefined;

  const shopViewEvents = viewEvents.filter(
    (event) => event.shopId === shopId && inRange(event.ts, range),
  );
  const shopFavorites = favoriteEvents.filter(
    (event) => event.shopId === shopId && inRange(event.ts, range),
  );
  const shopContacts = contactViewEvents.filter(
    (event) => event.shopId === shopId && inRange(event.ts, range),
  );
  const pageViews = shopPageViews.filter(
    (event) => event.shopId === shopId && inRange(event.ts, range),
  );

  const totalViews = shopViewEvents.length;
  const totalFavorites = shopFavorites.length;
  const totalContactViews = shopContacts.length;

  const dailySeries = Object.entries(
    groupByDate([
      ...shopViewEvents.map((e) => e.ts),
      ...shopFavorites.map((e) => e.ts),
      ...shopContacts.map((e) => e.ts),
    ]),
  ).map(([date]) => ({
    date,
    views: shopViewEvents.filter((e) => toDayString(e.ts) === date).length,
    favorites: shopFavorites.filter((e) => toDayString(e.ts) === date).length,
    contactViews: shopContacts.filter((e) => toDayString(e.ts) === date).length,
  }));

  const listingsByViews = shopViewEvents.reduce<Record<string, number>>(
    (acc, event) => {
      acc[event.listingId] = (acc[event.listingId] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const topListingsByViews = Object.entries(listingsByViews)
    .map(([listingId, views]) => {
      const listing = getListing(listingId);
      const template = productTemplates.find(
        (product) => product.id === listing?.productTemplateId,
      );
      const contacts = shopContacts.filter((c) => c.listingId === listingId).length;
      const conversionRate = views === 0 ? 0 : contacts / views;
      return {
        listingId,
        title: template?.title ?? "",
        views,
        contactViews: contacts,
        conversionRate,
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const geoDistribution = shopViewEvents.reduce<
    Record<string, { city: string; district?: string; views: number; users: Set<string | undefined> }>
  >((acc, event) => {
    const city = event.location?.city ?? "Неизвестно";
    const district = event.location?.district;
    const key = `${city}-${district ?? ""}`;
    if (!acc[key]) {
      acc[key] = { city, district, views: 0, users: new Set() };
    }
    acc[key].views += 1;
    acc[key].users.add(event.userId);
    return acc;
  }, {});

  const landingSources = pageViews.reduce<Record<string, number>>((acc, event) => {
    const key = event.source ?? "other";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return {
    shop,
    totalViews,
    totalFavorites,
    totalContactViews,
    conversions: {
      viewToContactRate: totalViews === 0 ? 0 : totalContactViews / totalViews,
    },
    dailySeries,
    topListingsByViews,
    geoDistribution: Object.values(geoDistribution).map((entry) => ({
      city: entry.city,
      district: entry.district,
      views: entry.views,
      uniqueUsers: entry.users.size,
    })),
    landingSources,
  };
}

export function getListingAnalytics(
  shopId: string,
  listingId: string,
  range: DateRange,
) {
  const listing = getListing(listingId);
  if (!listing || listing.shopId !== shopId) return undefined;

  const listingViews = viewEvents.filter(
    (event) => event.listingId === listingId && inRange(event.ts, range),
  );
  const listingFavorites = favoriteEvents.filter(
    (event) => event.listingId === listingId && inRange(event.ts, range),
  );
  const listingContacts = contactViewEvents.filter(
    (event) => event.listingId === listingId && inRange(event.ts, range),
  );
  const listingComplaints = complaints.filter(
    (event) => event.listingId === listingId && inRange(event.ts, range),
  );
  const listingRatings = ratings.filter(
    (rating) => rating.targetId === listingId && rating.targetType === "listing",
  );

  const dailySeries = Object.entries(groupByDate(listingViews.map((e) => e.ts))).map(
    ([date, views]) => ({
      date,
      views,
      favorites: listingFavorites.filter((f) => toDayString(f.ts) === date).length,
      contactViews: listingContacts.filter((c) => toDayString(c.ts) === date).length,
    }),
  );

  const geoDistribution = listingViews.reduce<
    Record<string, { city: string; district?: string; views: number }>
  >((acc, event) => {
    const city = event.location?.city ?? "Неизвестно";
    const district = event.location?.district;
    const key = `${city}-${district ?? ""}`;
    if (!acc[key]) {
      acc[key] = { city, district, views: 0 };
    }
    acc[key].views += 1;
    return acc;
  }, {});

  const distanceBuckets = listingViews.reduce<Record<string, number>>((acc, event) => {
    if (!event.location) return acc;
    const km = haversineDistanceKm(listing.location, event.location);
    const bucket = bucketDistance(km);
    acc[bucket] = (acc[bucket] ?? 0) + 1;
    return acc;
  }, {});

  const ratingsSummary = listingRatings.reduce<Record<number, number>>((acc, rating) => {
    acc[rating.value] = (acc[rating.value] ?? 0) + 1;
    return acc;
  }, {});

  const complaintsSummary = listingComplaints.reduce<Record<string, number>>(
    (acc, complaint) => {
      acc[complaint.reason] = (acc[complaint.reason] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const avgRating =
    listingRatings.reduce((sum, rating) => sum + rating.value, 0) /
    (listingRatings.length || 1);

  return {
    listing,
    dailySeries,
    geoDistribution: Object.values(geoDistribution),
    distanceBuckets,
    favoritesCount: listingFavorites.length,
    contactViewsCount: listingContacts.length,
    complaintsSummary: {
      totalComplaints: listingComplaints.length,
      byReason: complaintsSummary,
    },
    ratingsSummary: {
      avgRating,
      countByValue: ratingsSummary,
    },
  };
}

export function getPricePosition(listingId: string, region?: string) {
  const listing = getListing(listingId);
  if (!listing) return undefined;

  const template = productTemplates.find(
    (product) => product.id === listing.productTemplateId,
  );
  const regionKey = region ?? listing.location.city;
  const marketSample = marketPrices.filter(
    (price) => price.categoryId === template?.categoryId && price.region === regionKey,
  );

  if (!marketSample.length) {
    return {
      listing,
      marketAvgPrice: null,
      marketMedianPrice: null,
      marketMinPrice: null,
      marketMaxPrice: null,
      sellerPrice: listing.price,
      sellerPosition: "around_market" as const,
      recommendation: "Недостаточно данных по рынку",
    };
  }

  const prices = marketSample.map((m) => m.price).sort((a, b) => a - b);
  const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const mid = Math.floor(prices.length / 2);
  const median =
    prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid];
  const min = prices[0];
  const max = prices[prices.length - 1];

  let sellerPosition: "below_market" | "around_market" | "above_market" =
    "around_market";
  const delta = ((listing.price - avg) / avg) * 100;
  if (delta < -10) sellerPosition = "below_market";
  else if (delta > 10) sellerPosition = "above_market";

  const recommendation =
    sellerPosition === "below_market"
      ? `Вы на ${Math.abs(delta).toFixed(1)}% дешевле среднего по рынку в регионе ${regionKey}`
      : sellerPosition === "above_market"
        ? `Вы на ${delta.toFixed(1)}% дороже рынка, возможно, стоит пересмотреть цену`
        : "Цена в пределах среднего по рынку";

  return {
    listing,
    marketAvgPrice: avg,
    marketMedianPrice: median,
    marketMinPrice: min,
    marketMaxPrice: max,
    sellerPrice: listing.price,
    sellerPosition,
    recommendation,
  };
}

export function calculateSellerQualityScore(shopId: string): SellerQualityScore | undefined {
  const shop = getShop(shopId);
  if (!shop) return undefined;

  const relevantListings = listings.filter((listing) => listing.shopId === shopId);
  const shopViews = viewEvents.filter((event) => event.shopId === shopId);
  const shopComplaints = complaints.filter((complaint) => complaint.shopId === shopId);
  const shopRatings = ratings.filter(
    (rating) =>
      (rating.targetType === "shop" && rating.targetId === shopId) ||
      relevantListings.some((listing) => listing.id === rating.targetId),
  );

  let score = 100;
  const avgRating =
    shopRatings.reduce((sum, rating) => sum + rating.value, 0) /
    (shopRatings.length || 1);

  if (avgRating < 3) score -= 30;
  else if (avgRating < 4) score -= 10;

  const complaintRate =
    shopViews.length === 0 ? 0 : (shopComplaints.length / shopViews.length) * 1000;
  if (complaintRate > 50) score -= 30;
  else if (complaintRate > 20) score -= 10;

  const suspiciousFlags: string[] = [];
  if (complaintRate > 50) suspiciousFlags.push("many_fake_complaints");
  if (avgRating < 3) suspiciousFlags.push("too_many_low_ratings");

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    shopId,
    score,
    avgRating,
    complaintsPer1000Views: complaintRate,
    suspiciousFlags,
  };
}
