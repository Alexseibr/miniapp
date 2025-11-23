import mongoose from 'mongoose';

const NotificationEventSchema = new mongoose.Schema(
  {
    adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true },
    type: {
      type: String,
      enum: ['price_change', 'status_change'],
      required: true,
    },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    watchers: [{ type: Number }],
    processed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('NotificationEvent', NotificationEventSchema);
