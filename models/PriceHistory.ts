import { Document, Schema, Types, model } from 'mongoose';

export interface IPriceHistory {
  adId: Types.ObjectId;
  oldPrice: number;
  newPrice: number;
  changedAt: Date;
}

export interface IPriceHistoryDocument extends IPriceHistory, Document {}

const PriceHistorySchema = new Schema<IPriceHistoryDocument>({
  adId: { type: Schema.Types.ObjectId, ref: 'Ad', required: true },
  oldPrice: { type: Number, required: true },
  newPrice: { type: Number, required: true },
  changedAt: { type: Date, default: () => new Date() },
});

const PriceHistory = model<IPriceHistoryDocument>('PriceHistory', PriceHistorySchema);

export default PriceHistory;
