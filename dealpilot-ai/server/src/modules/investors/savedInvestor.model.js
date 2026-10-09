import mongoose from 'mongoose';

const { Schema } = mongoose;

const savedInvestorSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    investorId: { type: Schema.Types.ObjectId, ref: 'Investor', required: true },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { strict: true, timestamps: true },
);

savedInvestorSchema.index({ userId: 1, investorId: 1 }, { unique: true });

export default mongoose.model('SavedInvestor', savedInvestorSchema);
