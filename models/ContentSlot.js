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
