import mongoose from 'mongoose';

const ContactViewEventSchema = new mongoose.Schema(
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

ContactViewEventSchema.index({ listingId: 1, ts: -1 });
ContactViewEventSchema.index({ shopId: 1, ts: -1 });

const ContactViewEvent =
  mongoose.models.ContactViewEvent || mongoose.model('ContactViewEvent', ContactViewEventSchema);

export default ContactViewEvent;
