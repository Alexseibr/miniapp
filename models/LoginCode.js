const mongoose = require('mongoose');

const LoginCodeSchema = new mongoose.Schema(
  {
    phone: { type: String, index: true },
    code: String,
    expiresAt: Date,
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

LoginCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('LoginCode', LoginCodeSchema);
