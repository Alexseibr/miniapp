import mongoose from 'mongoose';

const ShopFairParticipationSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    fairId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fair',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'active', 'finished'],
      default: 'pending',
      index: true,
    },
    specialNote: { type: String, trim: true, default: null },
    preferredDelivery: {
      type: String,
      enum: ['pickup', 'courier', 'both'],
      default: 'both',
    },
  },
  { timestamps: true }
);

ShopFairParticipationSchema.index({ fairId: 1, shopId: 1 }, { unique: true });

const ShopFairParticipation =
  mongoose.models.ShopFairParticipation ||
  mongoose.model('ShopFairParticipation', ShopFairParticipationSchema);

export default ShopFairParticipation;
