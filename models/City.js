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
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    timezone: {
      type: String,
      default: 'Europe/Minsk',
      trim: true,
    },
    theme: {
      primaryColor: {
        type: String,
        default: '#FF6B35',
      },
      accentColor: {
        type: String,
        default: '#FFB84D',
      },
      logoUrl: {
        type: String,
      },
    },
    features: {
      liveSpots: {
        type: Boolean,
        default: true,
      },
      seasonalShowcases: {
        type: Boolean,
        default: true,
      },
      premiumListings: {
        type: Boolean,
        default: true,
      },
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
    metadata: {
      population: {
        type: Number,
      },
      region: {
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

export default mongoose.model('City', citySchema);
