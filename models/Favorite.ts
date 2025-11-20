import { Schema, model, Document, Types } from 'mongoose';

export interface IFavorite {
  userTelegramId: string;
  adId: Types.ObjectId;
  notifyOnPriceChange?: boolean;
  notifyOnStatusChange?: boolean;
  createdAt?: Date;
}

export interface IFavoriteDocument extends IFavorite, Document {}

const FavoriteSchema = new Schema<IFavoriteDocument>(
  {
    userTelegramId: { type: String, required: true },
    adId: { type: Schema.Types.ObjectId, ref: 'Ad', required: true },
    notifyOnPriceChange: { type: Boolean, default: false },
    notifyOnStatusChange: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Favorite = model<IFavoriteDocument>('Favorite', FavoriteSchema);

export default Favorite;
