import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['image', 'file'], required: true },
    url: { type: String, required: true },
    size: { type: Number },
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    threadId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatThread', required: true },
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true },
    text: { type: String },
    attachments: { type: [attachmentSchema], default: [] },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    isHiddenFor: {
      buyer: { type: Boolean, default: false },
      seller: { type: Boolean, default: false },
    },
    meta: {
      deliveredAt: { type: Date },
      readAt: { type: Date },
      deliveredTo: { type: [String], default: [] },
      readBy: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

chatMessageSchema.index({ threadId: 1, createdAt: 1 });

export default mongoose.model('ChatMessage', chatMessageSchema);
