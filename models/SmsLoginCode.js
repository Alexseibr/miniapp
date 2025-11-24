import mongoose from 'mongoose';

const SmsLoginCodeSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index: автоматически удаляет документы после истечения expiresAt
SmsLoginCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('SmsLoginCode', SmsLoginCodeSchema);
