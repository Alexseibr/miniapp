import mongoose from 'mongoose';

const ShopPageViewEventSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    source: {
      type: String,
      enum: ['telegram', 'instagram', 'direct', 'other'],
      default: 'other',
    },
    ts: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

ShopPageViewEventSchema.index({ shopId: 1, ts: -1 });
ShopPageViewEventSchema.index({ source: 1, ts: -1 });

const ShopPageViewEvent =
  mongoose.models.ShopPageViewEvent ||
  mongoose.model('ShopPageViewEvent', ShopPageViewEventSchema);

export default ShopPageViewEvent;
