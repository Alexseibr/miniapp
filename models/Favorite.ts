import { Schema, model, Document, Types } from 'mongoose';

export interface IFavorite {
  user: Types.ObjectId;
  ad: Types.ObjectId;
  adId?: Types.ObjectId;
  userTelegramId?: string;
  notifyOnPriceChange?: boolean;
  notifyOnStatusChange?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IFavoriteDocument extends IFavorite, Document {}

const FavoriteSchema = new Schema<IFavoriteDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ad: { type: Schema.Types.ObjectId, ref: 'Ad', required: true },
    // legacy
    adId: { type: Schema.Types.ObjectId, ref: 'Ad' },
    userTelegramId: { type: String },
    notifyOnPriceChange: { type: Boolean, default: false },
    notifyOnStatusChange: { type: Boolean, default: false },
  },
  { timestamps: true }
);

FavoriteSchema.index({ user: 1, ad: 1 }, { unique: true });
FavoriteSchema.index({ userTelegramId: 1, adId: 1 });

FavoriteSchema.pre('validate', function syncAdFields(next) {
  if (this.adId && !this.ad) {
    this.ad = this.adId;
  }

  if (this.ad && !this.adId) {
    this.adId = this.ad;
  }

  next();
});

const Favorite = model<IFavoriteDocument>('Favorite', FavoriteSchema);

export default Favorite;
