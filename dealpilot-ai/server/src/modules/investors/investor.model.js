import mongoose from 'mongoose';
import { INDUSTRIES, STAGES, INVESTOR_TYPES, BUSINESS_MODELS } from '../../common/constants/index.js';

const { Schema } = mongoose;

const investorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    organization: { type: String, trim: true, maxlength: 200 },
    investorType: { type: String, enum: INVESTOR_TYPES },
    thesis: { type: String, trim: true, maxlength: 3000 },
    industries: {
      type: [{ type: String, enum: INDUSTRIES }],
      validate: [(v) => v.length <= 20, 'Max 20 industries'],
    },
    stages: [{ type: String, enum: STAGES }],
    geographies: {
      type: [String],
      validate: [(v) => v.length <= 50, 'Max 50 geographies'],
    },
    minTicketSize: { type: Number, min: 0 },
    maxTicketSize: { type: Number, min: 0 },
    preferredBusinessModels: [{ type: String, enum: BUSINESS_MODELS }],
    websiteUrl: { type: String, trim: true, maxlength: 500 },
    publicContactInfo: { type: String, trim: true, maxlength: 500 },
    sourceUrl: { type: String, trim: true, maxlength: 500 },
    sourceType: { type: String, enum: ['manual', 'import', 'public-directory', 'demo'] },
    lastVerifiedAt: { type: Date },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'pending', 'verified'],
      default: 'unverified',
    },
    isDemoData: { type: Boolean, default: true, required: true },
    isActive: { type: Boolean, default: true },
  },
  { strict: true, timestamps: true },
);

investorSchema.index({ name: 'text', organization: 'text', thesis: 'text' });
investorSchema.index({ industries: 1 });
investorSchema.index({ stages: 1 });
investorSchema.index({ geographies: 1 });
investorSchema.index({ investorType: 1 });
investorSchema.index({ isDemoData: 1 });

export default mongoose.model('Investor', investorSchema);
