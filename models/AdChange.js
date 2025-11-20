const mongoose = require('mongoose');

const AdChangeSchema = new mongoose.Schema(
  {
    adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true },
    oldPrice: { type: Number },
    newPrice: { type: Number },
    oldStatus: { type: String },
    newStatus: { type: String },
    processed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AdChangeSchema.index({ adId: 1, processed: 1, createdAt: -1 });

module.exports = mongoose.model('AdChange', AdChangeSchema);
