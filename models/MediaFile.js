import mongoose from 'mongoose';

const mediaFileSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['image'],
      default: 'image',
    },
    ownerTelegramId: {
      type: Number,
      index: true,
      default: null,
    },
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ad',
      index: true,
      default: null,
    },
    originalKey: {
      type: String,
      required: true,
    },
    thumbKey: {
      type: String,
      default: null,
    },
    originalUrl: {
      type: String,
      required: true,
    },
    thumbUrl: {
      type: String,
      default: null,
    },
    size: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: 'image/jpeg',
    },
    status: {
      type: String,
      enum: ['temporary', 'attached', 'deleted'],
      default: 'temporary',
      index: true,
    },
    isMain: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

mediaFileSchema.index({ status: 1, createdAt: 1 });
mediaFileSchema.index({ adId: 1, isMain: -1 });

export default mongoose.model('MediaFile', mediaFileSchema);
