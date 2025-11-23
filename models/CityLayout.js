import mongoose from 'mongoose';

const blockSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'hero_banner',
        'category_grid',
        'ad_list',
        'promo_banner',
        'map_block',
        'seasonal_promo',
        'trending_ads',
        'farmers_market',
        'crafts_market',
      ],
    },
    slotId: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
    },
    categoryIds: {
      type: [String],
      default: [],
    },
    limit: {
      type: Number,
      default: 10,
    },
    layout: {
      type: String,
      enum: ['horizontal', 'vertical', 'grid', 'carousel'],
      default: 'horizontal',
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
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
