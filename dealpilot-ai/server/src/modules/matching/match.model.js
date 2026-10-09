import mongoose from 'mongoose';
import { ALGORITHM_VERSION } from '../../common/constants/index.js';

const { Schema } = mongoose;

const matchSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true },
    investorId: { type: Schema.Types.ObjectId, ref: 'Investor', required: true },
    totalScore: { type: Number, min: 0, max: 100 },
    breakdown: {
      industryScore: Number,
      stageScore: Number,
      ticketScore: Number,
      geoScore: Number,
      businessModelScore: Number,
    },
    explanations: [
      {
        criterion: String,
        score: Number,
        weight: Number,
        explanation: String,
        match: { type: String, enum: ['positive', 'partial', 'mismatch', 'unknown'] },
      },
    ],
    missingInfo: [String],
    algorithmVersion: { type: String, required: true, default: ALGORITHM_VERSION },
    startupSnapshot: { type: Schema.Types.Mixed },
    investorSnapshot: { type: Schema.Types.Mixed },
  },
  { strict: true, timestamps: true },
);

matchSchema.index({ userId: 1, investorId: 1 });
matchSchema.index({ userId: 1, totalScore: -1 });
matchSchema.index({ startupId: 1 });

export default mongoose.model('Match', matchSchema);
