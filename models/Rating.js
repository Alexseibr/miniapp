import mongoose from 'mongoose';

const RatingSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ['listing', 'shop'],
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    value: { type: Number, required: true, min: 1, max: 5 },
    reasonCode: { type: String, trim: true, default: null },
    ts: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

RatingSchema.index({ targetType: 1, targetId: 1, fromUserId: 1 }, { unique: true });
RatingSchema.index({ targetType: 1, targetId: 1, ts: -1 });

const Rating = mongoose.models.Rating || mongoose.model('Rating', RatingSchema);

export default Rating;
