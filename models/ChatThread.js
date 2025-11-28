import mongoose from 'mongoose';

const chatThreadSchema = new mongoose.Schema(
  {
    adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastMessageText: { type: String },
    lastMessageAt: { type: Date },
    unreadForBuyer: { type: Number, default: 0 },
    unreadForSeller: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'blocked', 'archived'],
      default: 'active',
    },
  },
  { timestamps: true }
);

chatThreadSchema.index({ buyerId: 1, sellerId: 1, adId: 1 }, { unique: true });
chatThreadSchema.index({ lastMessageAt: -1 });

export default mongoose.model('ChatThread', chatThreadSchema);
