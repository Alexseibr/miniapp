import mongoose from 'mongoose';

const categoryLifetimeConfigSchema = new mongoose.Schema({
  categoryId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  
  lifetimeType: {
    type: String,
    enum: ['perishable_daily', 'fast', 'medium', 'long'],
    required: true,
  },
  
  defaultTtlDays: {
    type: Number,
    required: true,
    min: 1,
  },
  
  remindBeforeExpireDays: {
    type: Number,
    default: null,
    min: 1,
  },
  
  remindMidLifetime: {
    type: Boolean,
    default: false,
  },
  
  allowDailyRepeat: {
    type: Boolean,
    default: false,
  },
  
  description: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

const CategoryLifetimeConfig = mongoose.model('CategoryLifetimeConfig', categoryLifetimeConfigSchema);

export default CategoryLifetimeConfig;
