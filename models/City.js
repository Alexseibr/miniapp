import mongoose from 'mongoose';

const citySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    theme: {
      primaryColor: {
        type: String,
        default: '#FF6B35',
      },
      logoUrl: {
        type: String,
      },
    },
    features: {
      enableFarmers: {
        type: Boolean,
        default: false,
      },
      enableCrafts: {
        type: Boolean,
        default: false,
      },
      enableTaxi: {
        type: Boolean,
        default: false,
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

export default mongoose.model('City', citySchema);
