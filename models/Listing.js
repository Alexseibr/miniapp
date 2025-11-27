import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    city: { type: String, required: true, trim: true },
    district: { type: String, trim: true, default: null },
  },
  { _id: false }
);

const ListingSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    productTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductTemplate',
      required: true,
      index: true,
    },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['active', 'paused', 'finished'],
      default: 'active',
      index: true,
    },
    fairId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fair',
      default: null,
      index: true,
    },
    location: { type: LocationSchema, required: true },
  },
  { timestamps: true }
);

ListingSchema.index({ shopId: 1, status: 1 });
ListingSchema.index({ fairId: 1, status: 1 });

const Listing = mongoose.models.Listing || mongoose.model('Listing', ListingSchema);

export default Listing;
