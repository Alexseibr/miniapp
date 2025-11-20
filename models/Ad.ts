import { Schema, model, Document } from 'mongoose';

export interface IAdGeo {
  type: string;
  coordinates: [number, number];
}

export interface IAd {
  title: string;
  description: string;
  price: number;
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
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  { _id: false }
);

const AdSchema = new Schema<IAdDocument>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
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
