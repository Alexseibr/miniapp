const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
      validate: [
        {
          validator: (value) => Array.isArray(value) && value.length === 2,
          message: 'У беседы должно быть ровно два участника',
        },
      ],
      required: true,
    },
    ad: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad', required: true },
  },
  { timestamps: true },
);

conversationSchema.pre('validate', function ensureParticipantsOrder(next) {
  if (Array.isArray(this.participants)) {
    const sortedIds = this.participants.map((id) => id.toString()).sort();
    this.participants = sortedIds.map((id) => new mongoose.Types.ObjectId(id));
  }
  next();
});

conversationSchema.index({ ad: 1, participants: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);
