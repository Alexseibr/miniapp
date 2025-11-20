const mongoose = require('mongoose');

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
      default: 'BYN',
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
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'Заказ должен содержать хотя бы один товар',
      },
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
      enum: ['new', 'processed', 'completed', 'cancelled'],
      default: 'new',
      index: true,
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

module.exports = mongoose.model('Order', orderSchema);
