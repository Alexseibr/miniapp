import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ad',
      required: true,
    },
    title: {
      type: String,
      required: true,
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
    currency: {
      type: String,
      default: 'RUB',
    },
    sellerTelegramId: {
      type: Number,
      required: true,
    },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    buyerTelegramId: {
      type: Number,
      required: true,
      index: true,
    },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
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
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'Заказ должен содержать хотя бы один товар',
      },
    },
    adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', index: true, default: null },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    sellerTelegramId: { type: Number, index: true, default: null },
    shopProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SellerProfile',
      index: true,
      default: null,
    },
    acceptedSellerIds: {
      type: [Number],
      default: [],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    seasonCode: {
      type: String,
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ['new', 'processed', 'completed', 'cancelled', 'NEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED'],
      default: 'new',
      index: true,
    },
    scheduledDate: { type: Date, default: null, index: true },
    deliveryRequired: { type: Boolean, default: false },
    deliveryAddress: { type: String, trim: true, default: null },
    deliveryLocation: {
      lat: { type: Number },
      lng: { type: Number },
    },
    quantityKg: { type: Number, min: 0, default: null },
    unit: { type: String, enum: ['kg', 'pcs', 'piece', 'unit', null], default: null },
    comment: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Автоматический расчет totalPrice если не указан
orderSchema.pre('save', function (next) {
  if (this.isNew && !this.totalPrice && this.items && this.items.length > 0) {
    this.totalPrice = this.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }
  next();
});

orderSchema.index({ buyerTelegramId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ sellerId: 1, scheduledDate: 1 });
orderSchema.index({ shopProfileId: 1, scheduledDate: 1 });
orderSchema.index({ adId: 1, scheduledDate: 1 });

export default mongoose.model('Order', orderSchema);
