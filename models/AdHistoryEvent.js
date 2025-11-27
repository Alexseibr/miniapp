import mongoose from 'mongoose';

const ChangeSchema = new mongoose.Schema({
  field: { type: String, required: true },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
}, { _id: false });

const PerformedBySchema = new mongoose.Schema({
  type: { type: String, enum: ['user', 'system', 'admin'], default: 'system' },
  id: { type: String },
  name: { type: String },
}, { _id: false });

const AdHistoryEventSchema = new mongoose.Schema(
  {
    adId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Ad', 
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ['created', 'updated', 'status_changed', 'moderation', 'price_changed', 'published', 'scheduled', 'viewed'],
      required: true,
    },
    description: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    performedBy: { type: PerformedBySchema },
    changes: [ChangeSchema],
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

AdHistoryEventSchema.index({ adId: 1, timestamp: -1 });
AdHistoryEventSchema.index({ adId: 1, eventType: 1 });

AdHistoryEventSchema.statics.logEvent = async function(adId, eventType, description, options = {}) {
  const event = new this({
    adId,
    eventType,
    description,
    performedBy: options.performedBy || { type: 'system' },
    changes: options.changes || [],
    metadata: options.metadata || {},
    timestamp: options.timestamp || new Date(),
  });
  return event.save();
};

AdHistoryEventSchema.statics.getAdHistory = async function(adId, limit = 50) {
  return this.find({ adId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

export default mongoose.model('AdHistoryEvent', AdHistoryEventSchema);
