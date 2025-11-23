import mongoose from 'mongoose';

const blockSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'search_bar',
        'hero_banner',
        'category_grid',
        'ad_list',
        'ad_carousel',
        'promo_banner',
        'promo_island',
        'seasonal_showcase',
        'seasonal_promo',
        'map_block',
        'trending_ads',
        'farmers_market',
        'crafts_market',
      ],
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
  },
  { _id: false }
);

const cityLayoutSchema = new mongoose.Schema(
  {
    cityCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    screen: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    variant: {
      type: String,
      trim: true,
      default: 'default',
    },
    seasonCode: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    blocks: {
      type: [blockSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

cityLayoutSchema.index({ cityCode: 1, screen: 1, variant: 1 });
cityLayoutSchema.index({ cityCode: 1, screen: 1, seasonCode: 1 });

export default mongoose.model('CityLayout', cityLayoutSchema);
