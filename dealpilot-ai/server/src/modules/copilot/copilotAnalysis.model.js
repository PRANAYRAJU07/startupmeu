import mongoose from 'mongoose';

const { Schema } = mongoose;

const copilotAnalysisSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup' },
    version: { type: Number, default: 1 },
    inputSnapshot: {
      startupText: String,
      pitchText: String,
      goals: String,
    },
    output: { type: Schema.Types.Mixed, required: true }, // The validated AI JSON
    providerMetadata: {
      provider: String,
      model: String,
      tokensUsed: Number,
    },
    isMock: { type: Boolean, default: false },
    status: { type: String, enum: ['draft', 'saved'], default: 'draft' }
  },
  { strict: true, timestamps: true },
);

copilotAnalysisSchema.index({ userId: 1, createdAt: -1 });
copilotAnalysisSchema.index({ startupId: 1 });

export default mongoose.model('CopilotAnalysis', copilotAnalysisSchema);
