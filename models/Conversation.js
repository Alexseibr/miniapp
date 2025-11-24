import mongoose from 'mongoose';

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
  { timestamps: true }
);

// Pre-save hook: сортируем participants для консистентности
conversationSchema.pre('validate', function ensureParticipantsOrder(next) {
  if (Array.isArray(this.participants)) {
    const sortedIds = this.participants.map((id) => id.toString()).sort();
    this.participants = sortedIds.map((id) => new mongoose.Types.ObjectId(id));
  }
  next();
});

// Уникальный индекс: один диалог на пару (ad + participants)
conversationSchema.index({ ad: 1, participants: 1 }, { unique: true });

export default mongoose.model('Conversation', conversationSchema);
