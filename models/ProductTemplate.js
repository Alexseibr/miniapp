import mongoose from 'mongoose';

const ProductTemplateSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    photos: {
      type: [String],
      validate: [(value) => value.length <= 4, 'Up to 4 photos allowed'],
      default: [],
    },
    categoryId: { type: String, required: true, index: true },
    tags: { type: [String], default: [] },
    seasonCode: { type: String, trim: true, default: null },
  },
  { timestamps: true }
);

const ProductTemplate =
  mongoose.models.ProductTemplate ||
  mongoose.model('ProductTemplate', ProductTemplateSchema);

export default ProductTemplate;
