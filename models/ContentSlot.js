import mongoose from 'mongoose';

const contentSlotSchema = new mongoose.Schema(
  {
    slotId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['hero_banner', 'promo_banner', 'seasonal_banner', 'category_banner'],
      default: 'hero_banner',
    },
    data: {
      title: {
        type: String,
        trim: true,
      },
      subtitle: {
        type: String,
        trim: true,
      },
      imageUrl: {
        type: String,
        trim: true,
      },
      link: {
        type: String,
        trim: true,
      },
      actionText: {
        type: String,
        trim: true,
      },
      buttonText: {
        type: String,
        trim: true,
      },
      backgroundColor: {
        type: String,
        trim: true,
      },
      textColor: {
        type: String,
        trim: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('ContentSlot', contentSlotSchema);
