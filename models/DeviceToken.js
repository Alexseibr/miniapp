import mongoose from 'mongoose';

const deviceTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    deviceId: { type: String, required: true },
    pushToken: { type: String, required: true },
    platform: { type: String, enum: ['ios', 'android'], required: true },
    appVersion: { type: String, default: null },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

deviceTokenSchema.index({ deviceId: 1 }, { unique: true });
deviceTokenSchema.index({ pushToken: 1 });

export default mongoose.model('DeviceToken', deviceTokenSchema);
