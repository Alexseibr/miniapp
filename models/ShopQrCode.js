import mongoose from 'mongoose';

const ShopQrCodeSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['public_url', 'deep_link'],
      required: true,
    },
    format: {
      type: String,
      enum: ['png', 'svg'],
      default: 'png',
      required: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

ShopQrCodeSchema.index({ shopId: 1, type: 1, format: 1 });

const ShopQrCode = mongoose.models.ShopQrCode || mongoose.model('ShopQrCode', ShopQrCodeSchema);

export default ShopQrCode;
