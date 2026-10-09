import mongoose from 'mongoose';

const { Schema } = mongoose;

const pitchAnalysisSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup' },
    version: { type: Number, default: 1 },
    pitchText: { type: String, required: true, maxlength: 10000 },
    fundraisingGoals: { type: String, maxlength: 1000 },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    provider: { type: String },
    model: { type: String },
    analysis: {
      executiveSummary: String,
      strengths: [{ category: String, explanation: String, evidence: String }],
      weaknesses: [{ category: String, severity: String, explanation: String, recommendation: String }],
      missingInfo: [String],
      marketPositioning: String,
      businessModelFeedback: String,
      tractionAssessment: String,
      readinessChecklist: [{ item: String, status: String, notes: String }],
      recommendations: [{ priority: String, category: String, suggestion: String, rationale: String }],
      followUpQuestions: [String],
      caveats: [String],
    },
    inputSnapshot: { type: Schema.Types.Mixed },
    error: { type: String, maxlength: 1000 },
    tokenUsage: {
      promptTokens: Number,
      completionTokens: Number,
      totalTokens: Number,
    },
  },
  { strict: true, timestamps: true },
);

pitchAnalysisSchema.index({ userId: 1, createdAt: -1 });
pitchAnalysisSchema.index({ startupId: 1 });

export default mongoose.model('PitchAnalysis', pitchAnalysisSchema);
