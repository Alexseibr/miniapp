import { Document, Schema, model } from 'mongoose';

export interface IAdGeo {
  type: 'Point';
  coordinates: [number, number];
}

export interface IAdLocation extends IAdGeo {
  address?: string;
}

export type AdStatus = 'pending' | 'active' | 'blocked';

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
  images?: string[];
  photos: string[];
  userTelegramId: string;
  owner?: Schema.Types.ObjectId;
  geo?: IAdGeo;
  location?: IAdLocation;
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

const LocationSchema = new Schema<IAdLocation>(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], index: '2dsphere', required: true },
    address: { type: String, trim: true },
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
    status: { type: String, enum: ['pending', 'active', 'blocked'], default: 'pending' },
    category: { type: String, required: true },
    subcategory: { type: String },
    seasonCode: { type: String },
    images: { type: [String], default: [] },
    photos: { type: [String], default: [] },
    userTelegramId: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    geo: { type: GeoSchema },
    location: { type: LocationSchema },
  },
  { timestamps: true }
);

AdSchema.index({ geo: '2dsphere' });
AdSchema.index({ location: '2dsphere' });

const Ad = model<IAdDocument>('Ad', AdSchema);

export default Ad;
