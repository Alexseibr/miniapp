const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const categorySchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    subcategories: { type: [subcategorySchema], default: [] },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Category', categorySchema);
