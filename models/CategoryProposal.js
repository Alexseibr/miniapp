import mongoose from 'mongoose';

const categoryProposalSchema = new mongoose.Schema(
  {
    parentCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    parentCategorySlug: {
      type: String,
      required: true,
      index: true,
    },
    suggestedSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    suggestedName: {
      type: String,
      required: true,
      trim: true,
    },
    keywordsSample: {
      type: [String],
      default: [],
    },
    matchedAdsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    matchedAdIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewedBy: {
      type: Number,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    createdCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

categoryProposalSchema.index({ status: 1, createdAt: -1 });
categoryProposalSchema.index({ parentCategorySlug: 1, suggestedSlug: 1 }, { unique: true });

export default mongoose.model('CategoryProposal', categoryProposalSchema);
