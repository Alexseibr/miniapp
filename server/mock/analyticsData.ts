import type {
  ContactViewEvent,
  FavoriteEvent,
  Listing,
  ProductTemplate,
  Rating,
  Shop,
  ShopPageViewEvent,
  ViewEvent,
  Complaint,
} from "@shared/shops";

const today = new Date();

const daysAgo = (days: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() - days);
  return date;
};

export const shops: Shop[] = [
  {
    id: "shop-1",
    ownerUserId: "owner-1",
    name: "KETMAR Fresh",
    description: "Фермерские продукты и сезонные букеты.",
    logoUrl: "https://example.com/logo1.png",
    instagram: "@ketmarfresh",
    website: "https://ketmar.example.com",
    telegramUsername: "ketmar_fresh",
    phone: "+375291111111",
    location: {
      lat: 53.9,
      lng: 27.5667,
      city: "Минск",
      district: "Центральный",
      addressLine: "ул. Советская, 10",
    },
    sellerType: "farmer",
    status: "approved",
    createdAt: daysAgo(120),
    updatedAt: today,
    analyticsPlan: "free",
    isVerified: true,
    slug: "ketmar-fresh",
  },
  {
    id: "shop-2",
    ownerUserId: "owner-2",
    name: "Market City",
    description: "Городской маркет свежих товаров.",
    logoUrl: "https://example.com/logo2.png",
    telegramUsername: "market_city",
    phone: "+375291212121",
    location: {
      lat: 52.0917,
      lng: 23.685,
      city: "Брест",
      district: "Ленинский",
      addressLine: "пр. Машерова, 20",
    },
    sellerType: "shop",
    status: "approved",
    createdAt: daysAgo(200),
    updatedAt: today,
    analyticsPlan: "pro",
    slug: "market-city",
  },
];

export const productTemplates: ProductTemplate[] = [
  {
    id: "pt-1",
    shopId: "shop-1",
    title: "Тюльпаны Красные",
    description: "Красные тюльпаны с фермы.",
    categoryId: "flowers",
    photos: ["https://example.com/tulips.jpg"],
    createdAt: daysAgo(60),
    updatedAt: daysAgo(2),
    seasonCode: "tulips_march8",
  },
  {
    id: "pt-2",
    shopId: "shop-1",
    title: "Мёд майский",
    description: "Натуральный мёд нового сбора.",
    categoryId: "honey",
    photos: ["https://example.com/honey.jpg"],
    createdAt: daysAgo(40),
    updatedAt: daysAgo(1),
  },
];

export const listings: Listing[] = [
  {
    id: "list-1",
    shopId: "shop-1",
    productTemplateId: "pt-1",
    price: 15,
    quantity: 120,
    status: "active",
    location: shops[0].location,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
    fairId: "fair-8march",
  },
  {
    id: "list-2",
    shopId: "shop-1",
    productTemplateId: "pt-2",
    price: 20,
    quantity: 40,
    status: "active",
    location: shops[0].location,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(3),
  },
];

const eventLocation = [
  { lat: 53.9, lng: 27.55, city: "Минск", district: "Советский" },
  { lat: 53.92, lng: 27.6, city: "Минск", district: "Центральный" },
  { lat: 54.0, lng: 27.7, city: "Минск", district: "Октябрьский" },
];

const buildViewEvent = (listingId: string, dayOffset: number, idx: number): ViewEvent => ({
  id: `view-${listingId}-${dayOffset}-${idx}`,
  listingId,
  shopId: "shop-1",
  ts: daysAgo(dayOffset),
  location: eventLocation[idx % eventLocation.length],
});

export const viewEvents: ViewEvent[] = [
  ...Array.from({ length: 10 }, (_, i) => buildViewEvent("list-1", i % 7, i)),
  ...Array.from({ length: 6 }, (_, i) => buildViewEvent("list-2", (i % 5) + 2, i)),
];

export const favoriteEvents: FavoriteEvent[] = [
  { id: "fav-1", userId: "u-1", listingId: "list-1", shopId: "shop-1", ts: daysAgo(2) },
  { id: "fav-2", userId: "u-2", listingId: "list-1", shopId: "shop-1", ts: daysAgo(4) },
];

export const contactViewEvents: ContactViewEvent[] = [
  { id: "c-1", userId: "u-1", listingId: "list-1", shopId: "shop-1", ts: daysAgo(1) },
  { id: "c-2", userId: "u-3", listingId: "list-2", shopId: "shop-1", ts: daysAgo(3) },
];

export const complaints: Complaint[] = [
  {
    id: "comp-1",
    listingId: "list-1",
    shopId: "shop-1",
    fromUserId: "u-4",
    reason: "wrong_price",
    ts: daysAgo(4),
  },
];

export const ratings: Rating[] = [
  {
    id: "rate-1",
    targetType: "listing",
    targetId: "list-1",
    fromUserId: "u-1",
    value: 5,
    ts: daysAgo(2),
  },
  {
    id: "rate-2",
    targetType: "shop",
    targetId: "shop-1",
    fromUserId: "u-2",
    value: 4,
    ts: daysAgo(6),
  },
];

export const shopPageViews: ShopPageViewEvent[] = [
  { id: "spv-1", shopId: "shop-1", ts: daysAgo(1), source: "telegram" },
  { id: "spv-2", shopId: "shop-1", ts: daysAgo(3), source: "instagram" },
  { id: "spv-3", shopId: "shop-1", ts: daysAgo(3), source: "direct" },
];

export const marketPrices: { categoryId: string; region: string; price: number }[] = [
  { categoryId: "flowers", region: "Минск", price: 16 },
  { categoryId: "flowers", region: "Минск", price: 15.5 },
  { categoryId: "flowers", region: "Минск", price: 14 },
  { categoryId: "honey", region: "Минск", price: 21 },
  { categoryId: "honey", region: "Минск", price: 22 },
];
