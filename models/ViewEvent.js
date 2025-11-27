import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    city: { type: String, trim: true, default: null },
    district: { type: String, trim: true, default: null },
  },
  { _id: false }
);

const ViewEventSchema = new mongoose.Schema(
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
      default: null,
      index: true,
    },
    ts: { type: Date, default: Date.now, index: true },
    location: { type: LocationSchema, default: null },
  },
  { timestamps: false }
);

ViewEventSchema.index({ listingId: 1, ts: -1 });
ViewEventSchema.index({ shopId: 1, ts: -1 });

const ViewEvent = mongoose.models.ViewEvent || mongoose.model('ViewEvent', ViewEventSchema);

export default ViewEvent;
