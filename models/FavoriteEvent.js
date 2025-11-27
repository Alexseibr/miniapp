import mongoose from 'mongoose';

const FavoriteEventSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ts: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

FavoriteEventSchema.index({ listingId: 1, userId: 1 }, { unique: true });
FavoriteEventSchema.index({ shopId: 1, ts: -1 });

const FavoriteEvent =
  mongoose.models.FavoriteEvent || mongoose.model('FavoriteEvent', FavoriteEventSchema);

export default FavoriteEvent;
