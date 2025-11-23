import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  images: [{
    type: String,
  }],
  stock: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'out_of_stock'],
    default: 'active',
  },
  sellerTelegramId: {
    type: String,
  },
}, {
  timestamps: true,
});

productSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('Product', productSchema);
