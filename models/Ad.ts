import { Document, Schema, model } from 'mongoose';

export interface IAdGeo {
  type: 'Point';
  coordinates: [number, number];
}

export type AdStatus = 'active' | 'sold' | 'archived';

export interface IAd {
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  priceChangedAt?: Date;
  status: AdStatus;
  category: string;
  subcategory?: string;
  seasonCode?: string;
  photos: string[];
  userTelegramId: string;
  geo: IAdGeo;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAdDocument extends IAd, Document {}

const GeoSchema = new Schema<IAdGeo>(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  { _id: false }
);

const AdSchema = new Schema<IAdDocument>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    oldPrice: { type: Number },
    priceChangedAt: { type: Date },
    status: { type: String, enum: ['active', 'sold', 'archived'], default: 'active' },
    category: { type: String, required: true },
    subcategory: { type: String },
    seasonCode: { type: String },
    photos: [{ type: String }],
    userTelegramId: { type: String, required: true },
    geo: { type: GeoSchema, required: true },
  },
  { timestamps: true }
);

AdSchema.index({ geo: '2dsphere' });

const Ad = model<IAdDocument>('Ad', AdSchema);

export default Ad;
