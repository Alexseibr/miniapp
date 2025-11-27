import { DEFAULT_ZONE_RADIUS_METERS, encodeGeoHash, getZoneId } from "../geoFeedUtils";

type SellerType = "private" | "shop";

export interface GeoAdMock {
  id: string;
  title: string;
  price: number;
  sellerType: SellerType;
  thumb: string;
  location: { lat: number; lng: number };
  geoZoneId: string;
  geoHash: string;
  createdAt: Date;
}

const now = Date.now();

const BASE_ADS: Array<Omit<GeoAdMock, "geoZoneId" | "geoHash">> = [
  {
    id: "ad-101",
    title: "Кофе с собой",
    price: 5,
    sellerType: "shop",
    thumb: "https://placehold.co/128x128?text=coffee",
    location: { lat: 53.9045, lng: 27.5615 },
    createdAt: new Date(now - 1000 * 60 * 15),
  },
  {
    id: "ad-102",
    title: "Домашний хлеб",
    price: 3,
    sellerType: "private",
    thumb: "https://placehold.co/128x128?text=bread",
    location: { lat: 53.9051, lng: 27.563 },
    createdAt: new Date(now - 1000 * 60 * 25),
  },
  {
    id: "ad-103",
    title: "Свежие цветы",
    price: 18,
    sellerType: "shop",
    thumb: "https://placehold.co/128x128?text=flowers",
    location: { lat: 53.9062, lng: 27.5655 },
    createdAt: new Date(now - 1000 * 60 * 40),
  },
  {
    id: "ad-104",
    title: "Ремонт обуви",
    price: 12,
    sellerType: "private",
    thumb: "https://placehold.co/128x128?text=shoes",
    location: { lat: 53.9032, lng: 27.5598 },
    createdAt: new Date(now - 1000 * 60 * 55),
  },
  {
    id: "ad-105",
    title: "Велопрокат",
    price: 7,
    sellerType: "shop",
    thumb: "https://placehold.co/128x128?text=bike",
    location: { lat: 53.902, lng: 27.5642 },
    createdAt: new Date(now - 1000 * 60 * 65),
  },
  {
    id: "ad-106",
    title: "Мороженое",
    price: 4,
    sellerType: "shop",
    thumb: "https://placehold.co/128x128?text=icecream",
    location: { lat: 53.9038, lng: 27.5668 },
    createdAt: new Date(now - 1000 * 60 * 75),
  },
  {
    id: "ad-107",
    title: "Стрижка на дому",
    price: 20,
    sellerType: "private",
    thumb: "https://placehold.co/128x128?text=haircut",
    location: { lat: 53.9072, lng: 27.5679 },
    createdAt: new Date(now - 1000 * 60 * 90),
  },
  {
    id: "ad-108",
    title: "Свежие овощи",
    price: 9,
    sellerType: "private",
    thumb: "https://placehold.co/128x128?text=veggies",
    location: { lat: 53.9015, lng: 27.5602 },
    createdAt: new Date(now - 1000 * 60 * 105),
  },
  {
    id: "ad-109",
    title: "Настольные игры",
    price: 25,
    sellerType: "shop",
    thumb: "https://placehold.co/128x128?text=games",
    location: { lat: 53.9048, lng: 27.5589 },
    createdAt: new Date(now - 1000 * 60 * 120),
  },
  {
    id: "ad-110",
    title: "Чистка одежды",
    price: 15,
    sellerType: "shop",
    thumb: "https://placehold.co/128x128?text=dryclean",
    location: { lat: 53.9067, lng: 27.5562 },
    createdAt: new Date(now - 1000 * 60 * 135),
  },
  {
    id: "ad-111",
    title: "Запеканка",
    price: 6,
    sellerType: "private",
    thumb: "https://placehold.co/128x128?text=casserole",
    location: { lat: 53.8999, lng: 27.5613 },
    createdAt: new Date(now - 1000 * 60 * 150),
  },
  {
    id: "ad-112",
    title: "Свежее молоко",
    price: 2,
    sellerType: "private",
    thumb: "https://placehold.co/128x128?text=milk",
    location: { lat: 53.8991, lng: 27.5657 },
    createdAt: new Date(now - 1000 * 60 * 165),
  },
  {
    id: "ad-113",
    title: "Уроки йоги",
    price: 30,
    sellerType: "private",
    thumb: "https://placehold.co/128x128?text=yoga",
    location: { lat: 53.9081, lng: 27.5625 },
    createdAt: new Date(now - 1000 * 60 * 180),
  },
  {
    id: "ad-114",
    title: "Сервис ноутбуков",
    price: 35,
    sellerType: "shop",
    thumb: "https://placehold.co/128x128?text=laptop",
    location: { lat: 53.9102, lng: 27.5684 },
    createdAt: new Date(now - 1000 * 60 * 210),
  },
  {
    id: "ad-115",
    title: "Прогулка с собакой",
    price: 8,
    sellerType: "private",
    thumb: "https://placehold.co/128x128?text=dogwalker",
    location: { lat: 53.9107, lng: 27.5591 },
    createdAt: new Date(now - 1000 * 60 * 240),
  },
];

export const GEO_ADS: GeoAdMock[] = BASE_ADS.map((ad) => ({
  ...ad,
  geoZoneId: getZoneId(ad.location.lat, ad.location.lng, DEFAULT_ZONE_RADIUS_METERS),
  geoHash: encodeGeoHash(ad.location.lat, ad.location.lng, DEFAULT_ZONE_RADIUS_METERS),
}));
