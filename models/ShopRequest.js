import mongoose from 'mongoose';

const GeoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      index: '2dsphere',
    },
  },
  { _id: false }
);

const WorkingHoursSchema = new mongoose.Schema(
  {
    preset: {
      type: String,
      enum: ['daily_9_21', 'daily_8_20', 'weekdays_9_18', 'custom', null],
      default: null,
    },
    customHours: {
      type: String,
      trim: true,
      default: null,
    },
    days: [{
      type: String,
      enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    }],
  },
  { _id: false }
);

const ContactsSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    telegram: {
      type: String,
      trim: true,
      default: null,
    },
    whatsapp: {
      type: String,
      trim: true,
      default: null,
    },
    instagram: {
      type: String,
      trim: true,
      default: null,
    },
    website: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);

const DeliveryOptionsSchema = new mongoose.Schema(
  {
    hasDelivery: {
      type: Boolean,
      default: false,
    },
    hasPickup: {
      type: Boolean,
      default: true,
    },
    deliveryZone: {
      type: String,
      trim: true,
      default: null,
    },
    deliveryRadius: {
      type: Number,
      default: null,
    },
    minOrderAmount: {
      type: Number,
      default: null,
    },
  },
  { _id: false }
);

const shopRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    telegramId: {
      type: Number,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    shopType: {
      type: String,
      enum: ['farmer', 'shop', 'service', 'blogger', 'artisan'],
      required: true,
    },
    shopRole: {
      type: String,
      enum: ['SHOP', 'FARMER', 'BLOGGER', 'ARTISAN'],
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    city: {
      type: String,
      trim: true,
      default: null,
    },
    region: {
      type: String,
      trim: true,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    geo: {
      type: GeoPointSchema,
      default: null,
    },
    contacts: {
      type: ContactsSchema,
      required: true,
    },
    workingHours: {
      type: WorkingHoursSchema,
      default: () => ({}),
    },
    avatar: {
      type: String,
      trim: true,
      default: null,
    },
    banner: {
      type: String,
      trim: true,
      default: null,
    },
    photos: [{
      type: String,
      trim: true,
    }],
    deliveryOptions: {
      type: DeliveryOptionsSchema,
      default: () => ({}),
    },
    categories: [{
      type: String,
      trim: true,
    }],
    rejectReason: {
      type: String,
      trim: true,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    createdSellerProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SellerProfile',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

shopRequestSchema.index({ status: 1, createdAt: -1 });
shopRequestSchema.index({ telegramId: 1, status: 1 });

shopRequestSchema.statics.getPendingCount = async function() {
  return this.countDocuments({ status: 'pending' });
};

shopRequestSchema.statics.getByUser = async function(userId) {
  return this.findOne({
    userId,
    status: { $in: ['pending', 'approved'] },
  }).sort({ createdAt: -1 });
};

shopRequestSchema.statics.hasActiveRequest = async function(telegramId) {
  const count = await this.countDocuments({
    telegramId,
    status: 'pending',
  });
  return count > 0;
};

const ShopRequest = mongoose.model('ShopRequest', shopRequestSchema);

export default ShopRequest;
