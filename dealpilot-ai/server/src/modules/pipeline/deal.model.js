import mongoose from 'mongoose';
import { PIPELINE_STAGES } from '../../common/constants/index.js';

const { Schema } = mongoose;

const dealSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    investorId: { type: Schema.Types.ObjectId, ref: 'Investor', required: true },
    investorName: { type: String },
    stage: { type: String, enum: PIPELINE_STAGES, required: true },
    notes: { type: String, trim: true, maxlength: 5000 },
    contactHistory: [
      {
        date: Date,
        method: String,
        summary: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    meetings: [
      {
        scheduledAt: Date,
        outcome: String,
        notes: String,
      },
    ],
    nextAction: { type: String, trim: true, maxlength: 500 },
    followUpDate: { type: Date },
    committedAmount: { type: Number, min: 0 },
    commitCurrency: { type: String, default: 'USD' },
    outcome: { type: String, trim: true, maxlength: 1000 },
    archivedAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { strict: true, timestamps: true },
);

dealSchema.index({ userId: 1, investorId: 1 });

export default mongoose.model('Deal', dealSchema);
