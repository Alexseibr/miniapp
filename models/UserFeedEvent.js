import mongoose from 'mongoose';

const userFeedEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    adId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ad',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: ['impression', 'view_open', 'like', 'dislike', 'scroll_next', 'scroll_prev'],
      index: true,
    },
    dwellTimeMs: {
      type: Number,
      default: null,
    },
    positionIndex: {
      type: Number,
      default: null,
    },
    radiusKm: {
      type: Number,
      default: 20,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'user_feed_events',
    timestamps: false,
  }
);

userFeedEventSchema.index({ userId: 1, adId: 1, eventType: 1 });
userFeedEventSchema.index({ userId: 1, createdAt: -1 });
userFeedEventSchema.index({ adId: 1, eventType: 1, createdAt: -1 });

const UserFeedEvent = mongoose.model('UserFeedEvent', userFeedEventSchema);

export default UserFeedEvent;
