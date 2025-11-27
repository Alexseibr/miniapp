import mongoose from 'mongoose';

const FairSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: null },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    isActive: { type: Boolean, default: false, index: true },
    bannerImageUrl: { type: String, trim: true, default: null },
    colorTheme: { type: String, trim: true, default: null },
    allowedCategoryIds: { type: [String], default: [] },
    allowedSellerTypes: {
      type: [String],
      enum: ['shop', 'farmer', 'individual'],
      default: undefined,
    },
  },
  { timestamps: true }
);

FairSchema.index({ isActive: 1, startAt: 1 });

const Fair = mongoose.models.Fair || mongoose.model('Fair', FairSchema);

export default Fair;
