import mongoose from 'mongoose';

const ComplaintSchema = new mongoose.Schema(
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
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: ['fake_product', 'wrong_price', 'spam', 'rude_seller', 'other'],
      required: true,
    },
    comment: { type: String, trim: true, default: null },
    ts: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

ComplaintSchema.index({ shopId: 1, ts: -1 });
ComplaintSchema.index({ listingId: 1, reason: 1 });

const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', ComplaintSchema);

export default Complaint;
