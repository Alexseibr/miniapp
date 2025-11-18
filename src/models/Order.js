import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Ad',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    sellerTelegramId: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    buyerTelegramId: {
      type: Number,
      required: true,
      index: true,
    },
    buyerName: {
      type: String,
      trim: true,
    },
    buyerUsername: {
      type: String,
      trim: true,
    },
    buyerPhone: {
      type: String,
      trim: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'Order must contain at least one item.',
      },
    },
    status: {
      type: String,
      enum: ['new', 'sent_to_sellers', 'processed', 'cancelled'],
      required: true,
      default: 'new',
    },
    seasonCode: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    comment: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Order', orderSchema);
