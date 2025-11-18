const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    parentSlug: { type: String, default: null, trim: true, lowercase: true },
    sortOrder: { type: Number, required: true, default: 0, min: 0 },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Category', categorySchema);
